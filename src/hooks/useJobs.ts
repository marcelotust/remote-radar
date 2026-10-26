import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { computeRelevanceScore } from '../utils/scoring'
import { DEFAULT_SCORING_CONFIG } from '../utils/keywords'
import { listedAt } from '../utils/jobDates'
import type { ScoringConfig } from '../types'
import { useScoringConfig } from './useScoringConfig'
import { useAuth } from '../contexts/AuthContext'
import type { Job, JobUserState } from '../types'

export const JOBS_KEY = ['jobs'] as const

/**
 * How far back the feed reaches, counted from a job's publication date (or its
 * first-scrape day when the source gives none). Older jobs stay in the table
 * but leave the feed.
 */
export const FEED_WINDOW_DAYS = 60

/**
 * A job the scraper hasn't seen listed for this long is treated as closed and
 * leaves the feed (the scraper stamps `last_seen_at` on every run).
 */
export const FEED_CLOSED_AFTER_DAYS = 3

/**
 * Rows requested per call. PostgREST caps every response at 1,000 rows by
 * default, so an unpaged select('*') silently truncates — that is what froze
 * the feed on 2026-09-14.
 */
export const FEED_PAGE_SIZE = 1000

// Keeps each `id=in.(...)` query string well under URL length limits.
const ID_CHUNK_SIZE = 100

const MS_PER_DAY = 86_400_000

// UTC calendar day, matching relativeDate's "hoje"/"ontem": jobs listed the
// same day are ranked by relevance instead of by which source batch finished last.
const listedDay = (job: Job): number => Math.floor((Date.parse(listedAt(job)) || 0) / MS_PER_DAY)

export const enrichJobs = (rawJobs: Job[], config: ScoringConfig = DEFAULT_SCORING_CONFIG): Job[] =>
  rawJobs
    .map((job) => {
      const { score, level, matchedKeywords } = computeRelevanceScore(job, config)
      return {
        ...job,
        relevance_score: score,
        relevance_level: level,
        matched_keywords: matchedKeywords,
      }
    })
    .sort(
      (a, b) =>
        listedDay(b) - listedDay(a) ||
        (b.relevance_score ?? 0) - (a.relevance_score ?? 0) ||
        (Date.parse(listedAt(b)) || 0) - (Date.parse(listedAt(a)) || 0)
    )

type PageResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>

/** Calls `page(from, to)` until a short page comes back, concatenating the rows. */
const fetchAllPages = async <T>(
  page: (from: number, to: number) => PageResult<T>
): Promise<T[]> => {
  const rows: T[] = []
  for (let from = 0; ; from += FEED_PAGE_SIZE) {
    const { data, error } = await page(from, from + FEED_PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if ((data ?? []).length < FEED_PAGE_SIZE) return rows
  }
}

const fetchJobsByIds = async (ids: string[]): Promise<Job[]> => {
  const rows: Job[] = []
  for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .in('id', ids.slice(i, i + ID_CHUNK_SIZE))
    if (error) throw error
    rows.push(...((data ?? []) as Job[]))
  }
  return rows
}

export const useJobs = () => {
  const { user } = useAuth()
  const { data: scoringConfig = DEFAULT_SCORING_CONFIG } = useScoringConfig()

  return useQuery<Job[]>({
    queryKey: JOBS_KEY,
    queryFn: async () => {
      const userId = user!.id
      const now = Date.now()
      const listedSince = new Date(now - FEED_WINDOW_DAYS * MS_PER_DAY).toISOString()
      const seenSince = new Date(now - FEED_CLOSED_AFTER_DAYS * MS_PER_DAY).toISOString()
      const [recent, states] = await Promise.all([
        fetchAllPages<Job>((from, to) =>
          supabase
            .from('jobs')
            .select('*')
            .gte('listed_at', listedSince)
            .gte('last_seen_at', seenSince)
            .order('listed_at', { ascending: false })
            .order('id')
            .range(from, to)
        ),
        fetchAllPages<JobUserState>((from, to) =>
          supabase
            .from('job_user_state')
            .select('*')
            .eq('user_id', userId)
            .order('id')
            .range(from, to)
        ),
      ])

      // Jobs the user applied to stay reachable after they age out of the
      // window or close, so the "Candidatado" filter keeps the whole history.
      const recentIds = new Set(recent.map((j) => j.id))
      const olderAppliedIds = states
        .filter((s) => s.status === 'applied' && !recentIds.has(s.job_id))
        .map((s) => s.job_id)
      const olderApplied = olderAppliedIds.length ? await fetchJobsByIds(olderAppliedIds) : []

      const stateByJobId = new Map(states.map((s) => [s.job_id, s]))
      return [...recent, ...olderApplied].map((job) => {
        const state = stateByJobId.get(job.id)
        return { ...job, status: state?.status ?? 'none', read: state?.read ?? false }
      })
    },
    select: (rawJobs) => enrichJobs(rawJobs, scoringConfig),
    enabled: !!user,
  })
}
