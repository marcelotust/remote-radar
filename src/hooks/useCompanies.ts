import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Company } from '../types'

export const COMPANIES_KEY = ['companies'] as const

export const useCompanies = () =>
  useQuery<Company[]>({
    queryKey: COMPANIES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Company[]
    },
  })
