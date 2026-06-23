import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { computeRelevanceScore } from '../utils/scoring'
import { KEYWORD_CONFIG } from '../utils/keywords'
import { useCompanies } from './useCompanies'
import type { Company, Job, RelevanceLevel } from '../types'

export const JOBS_KEY = ['jobs'] as const

export const enrichJobs = (rawJobs: Job[], companies: Company[]): Job[] => {
  const wishlistMap = new Map(companies.map((c) => [c.name.toLowerCase(), c]))
  return rawJobs
    .map((job) => {
      const hasStored = job.relevance_score != null && job.relevance_level != null
      const computed = hasStored ? null : computeRelevanceScore(job, KEYWORD_CONFIG)
      const score = hasStored ? (job.relevance_score as number) : computed!.score
      const level: RelevanceLevel = hasStored
        ? (job.relevance_level as RelevanceLevel)
        : computed!.level
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

  return useQuery<Job[]>({
    queryKey: JOBS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*')
      if (error) throw error
      return data as Job[]
    },
    select: (rawJobs) => enrichJobs(rawJobs, companies),
  })
}
