import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SOURCES_KEY } from './useSources'
import type { ScrapingSource } from '../types'

type NewSource = Omit<ScrapingSource, 'id' | 'created_at'>

export const useAddSource = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: NewSource): Promise<ScrapingSource> => ({
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }),
    onSuccess: (source) => {
      qc.setQueryData<ScrapingSource[]>(SOURCES_KEY, (old) => [...(old ?? []), source])
    },
  })
}

export const useEditSource = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (source: ScrapingSource): Promise<ScrapingSource> => source,
    onSuccess: (updated) => {
      qc.setQueryData<ScrapingSource[]>(
        SOURCES_KEY,
        (old) => old?.map((s) => (s.id === updated.id ? updated : s)) ?? []
      )
    },
  })
}

export const useDeleteSource = () => {
  const qc = useQueryClient()
  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async (_id: string): Promise<void> => {},
    onSuccess: (_, id) => {
      qc.setQueryData<ScrapingSource[]>(SOURCES_KEY, (old) => old?.filter((s) => s.id !== id) ?? [])
    },
  })
}
