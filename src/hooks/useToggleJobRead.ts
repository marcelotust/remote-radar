import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { JOBS_KEY } from './useJobs'
import type { Job } from '../types'

interface TogglePayload {
  id: string
  read: boolean
}

export const useToggleJobRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: TogglePayload): Promise<TogglePayload> => {
      const { error } = await supabase
        .from('jobs')
        .update({ read: payload.read })
        .eq('id', payload.id)
      if (error) throw error
      return payload
    },
    onMutate: async ({ id, read }) => {
      await qc.cancelQueries({ queryKey: JOBS_KEY })
      const previous = qc.getQueryData<Job[]>(JOBS_KEY)
      qc.setQueryData<Job[]>(
        JOBS_KEY,
        (old) => old?.map((j) => (j.id === id ? { ...j, read } : j)) ?? []
      )
      return { previous }
    },
    onError: (_, __, context) => {
      if (context?.previous) qc.setQueryData(JOBS_KEY, context.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: JOBS_KEY })
    },
  })
}
