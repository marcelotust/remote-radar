import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { computeRelevanceScore } from '../utils/scoring'
import { DEFAULT_SCORING_CONFIG } from '../utils/keywords'
import type { ScoringConfig } from '../types'
import { useScoringConfig } from './useScoringConfig'
import type { Job } from '../types'

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
  const { data: scoringConfig = DEFAULT_SCORING_CONFIG } = useScoringConfig()

  return useQuery<Job[]>({
    queryKey: JOBS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*')
      if (error) throw error
      return data as Job[]
    },
    select: (rawJobs) => enrichJobs(rawJobs, scoringConfig),
  })
}
