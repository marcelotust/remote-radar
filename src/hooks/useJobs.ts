import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { computeRelevanceScore } from '../utils/scoring'
import { DEFAULT_SCORING_CONFIG } from '../utils/keywords'
import type { ScoringConfig } from '../types'
import { useCompanies } from './useCompanies'
import { useScoringConfig } from './useScoringConfig'
import type { Company, Job } from '../types'

export const JOBS_KEY = ['jobs'] as const

export const enrichJobs = (
  rawJobs: Job[],
  companies: Company[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): Job[] => {
  const wishlistMap = new Map(companies.map((c) => [c.name.toLowerCase(), c]))
  return rawJobs
    .map((job) => {
      const { score, level } = computeRelevanceScore(job, config)
      const wishlistCompany = wishlistMap.get(job.company.toLowerCase())
      return {
        ...job,
        relevance_score: score,
        relevance_level: level,
        is_wishlist_company: !!wishlistCompany,
        wishlist_remote_brazil: wishlistCompany?.remote_brazil,
      }
    })
    .sort((a, b) => {
      const t = new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime()
      return t !== 0 ? t : (b.relevance_score ?? 0) - (a.relevance_score ?? 0)
    })
}

export const useJobs = () => {
  const { data: companies = [] } = useCompanies()
  const { data: scoringConfig = DEFAULT_SCORING_CONFIG } = useScoringConfig()

  return useQuery<Job[]>({
    queryKey: JOBS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*')
      if (error) throw error
      return data as Job[]
    },
    select: (rawJobs) => enrichJobs(rawJobs, companies, scoringConfig),
  })
}
