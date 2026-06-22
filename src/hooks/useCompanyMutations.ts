import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { COMPANIES_KEY } from './useCompanies'
import type { Company } from '../types'

type NewCompany = Omit<Company, 'id' | 'created_at'>

export const useAddCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: NewCompany): Promise<Company> => {
      const { data: inserted, error } = await supabase
        .from('companies')
        .insert(data)
        .select()
        .single()
      if (error) throw error
      return inserted as Company
    },
    onSuccess: (company) => {
      qc.setQueryData<Company[]>(COMPANIES_KEY, (old) => [...(old ?? []), company])
    },
  })
}

export const useEditCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (company: Company): Promise<Company> => {
      const patch = {
        name: company.name,
        website: company.website,
        notes: company.notes,
        remote_brazil: company.remote_brazil,
      }
      const { data: updated, error } = await supabase
        .from('companies')
        .update(patch)
        .eq('id', company.id)
        .select()
        .single()
      if (error) throw error
      return updated as Company
    },
    onSuccess: (updated) => {
      qc.setQueryData<Company[]>(
        COMPANIES_KEY,
        (old) => old?.map((c) => (c.id === updated.id ? updated : c)) ?? []
      )
    },
  })
}

export const useDeleteCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('companies').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, id) => {
      qc.setQueryData<Company[]>(COMPANIES_KEY, (old) => old?.filter((c) => c.id !== id) ?? [])
    },
  })
}
