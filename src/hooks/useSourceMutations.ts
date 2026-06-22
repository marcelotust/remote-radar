import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { SOURCES_KEY } from './useSources'
import type { ScrapingSource } from '../types'

type NewSource = Omit<ScrapingSource, 'id' | 'created_at'>

export const useAddSource = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: NewSource): Promise<ScrapingSource> => {
      const { data: inserted, error } = await supabase
        .from('scraping_sources')
        .insert(data)
        .select()
        .single()
      if (error) throw error
      return inserted as ScrapingSource
    },
    onSuccess: (source) => {
      qc.setQueryData<ScrapingSource[]>(SOURCES_KEY, (old) => [...(old ?? []), source])
    },
  })
}

export const useEditSource = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (source: ScrapingSource): Promise<ScrapingSource> => {
      const patch = {
        label: source.label,
        url: source.url,
        is_active: source.is_active,
      }
      const { data: updated, error } = await supabase
        .from('scraping_sources')
        .update(patch)
        .eq('id', source.id)
        .select()
        .single()
      if (error) throw error
      return updated as ScrapingSource
    },
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
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('scraping_sources').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, id) => {
      qc.setQueryData<ScrapingSource[]>(SOURCES_KEY, (old) => old?.filter((s) => s.id !== id) ?? [])
    },
  })
}
