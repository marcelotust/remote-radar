import { useQuery } from '@tanstack/react-query'
import { MOCK_COMPANIES } from '../data/mockData'
import type { Company } from '../types'

export const COMPANIES_KEY = ['companies'] as const

export const useCompanies = () =>
  useQuery<Company[]>({
    queryKey: COMPANIES_KEY,
    queryFn: async () => structuredClone(MOCK_COMPANIES),
  })
