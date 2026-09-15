import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { computeRelevanceScore } from '../utils/scoring'
import { DEFAULT_SCORING_CONFIG } from '../utils/keywords'
import type { ScoringConfig } from '../types'
import { useScoringConfig } from './useScoringConfig'
import { useAuth } from '../contexts/AuthContext'
import type { Job, JobUserState } from '../types'

export const JOBS_KEY = ['jobs'] as const

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
    .sort((a, b) => {
      const t = new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime()
      return t !== 0 ? t : (b.relevance_score ?? 0) - (a.relevance_score ?? 0)
    })

export const useJobs = () => {
  const { user } = useAuth()
  const { data: scoringConfig = DEFAULT_SCORING_CONFIG } = useScoringConfig()

  return useQuery<Job[]>({
    queryKey: JOBS_KEY,
    queryFn: async () => {
      const userId = user!.id
      const [jobsRes, stateRes] = await Promise.all([
        supabase.from('jobs').select('*'),
        supabase.from('job_user_state').select('*').eq('user_id', userId),
      ])
      if (jobsRes.error) throw jobsRes.error
      if (stateRes.error) throw stateRes.error

      const stateByJobId = new Map((stateRes.data as JobUserState[]).map((s) => [s.job_id, s]))
      return (jobsRes.data as Job[]).map((job) => {
        const state = stateByJobId.get(job.id)
        return { ...job, status: state?.status ?? 'none', read: state?.read ?? false }
      })
    },
    select: (rawJobs) => enrichJobs(rawJobs, scoringConfig),
    enabled: !!user,
  })
}
