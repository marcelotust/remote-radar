import { useQuery } from '@tanstack/react-query'
import { MOCK_SOURCES } from '../data/mockData'
import type { ScrapingSource } from '../types'

export const SOURCES_KEY = ['sources'] as const

export const useSources = () =>
  useQuery<ScrapingSource[]>({
    queryKey: SOURCES_KEY,
    queryFn: async () => structuredClone(MOCK_SOURCES),
  })
