import { useMutation, useQueryClient } from '@tanstack/react-query'
import { COMPANIES_KEY } from './useCompanies'
import type { Company } from '../types'

type NewCompany = Omit<Company, 'id' | 'created_at'>

export const useAddCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: NewCompany): Promise<Company> => ({
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }),
    onSuccess: (company) => {
      qc.setQueryData<Company[]>(COMPANIES_KEY, (old) => [...(old ?? []), company])
    },
  })
}

export const useEditCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (company: Company): Promise<Company> => company,
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async (_id: string): Promise<void> => {},
    onSuccess: (_, id) => {
      qc.setQueryData<Company[]>(COMPANIES_KEY, (old) => old?.filter((c) => c.id !== id) ?? [])
    },
  })
}
