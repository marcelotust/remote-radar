import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ScrapingSource } from '../types'

export const SOURCES_KEY = ['sources'] as const

export const useSources = () =>
  useQuery<ScrapingSource[]>({
    queryKey: SOURCES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scraping_sources')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as ScrapingSource[]
    },
  })
