import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { computeRelevanceScore } from '../utils/scoring'
import { KEYWORD_CONFIG } from '../utils/keywords'
import { useCompanies } from './useCompanies'
import type { Job } from '../types'

export const JOBS_KEY = ['jobs'] as const

export const useJobs = () => {
  const { data: companies = [] } = useCompanies()

  const wishlistMap = useMemo(
    () => new Map(companies.map((c) => [c.name.toLowerCase(), c])),
    [companies]
  )

  return useQuery<Job[]>({
    queryKey: JOBS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*')
      if (error) throw error
      return data as Job[]
    },
    select: (rawJobs) =>
      rawJobs
        .map((job) => {
          const { score, level } = computeRelevanceScore(job, KEYWORD_CONFIG)
          const wishlistCompany = wishlistMap.get(job.company.toLowerCase())
          return {
            ...job,
            relevance_score: score,
            relevance_level: level,
            is_wishlist_company: !!wishlistCompany,
            wishlist_remote_brazil: wishlistCompany?.remote_brazil,
          }
        })
        .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0)),
  })
}
