import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { JOBS_KEY } from './useJobs'
import type { Job } from '../types'

interface TogglePayload {
  id: string
  read: boolean
}

export const useToggleJobRead = () => {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (payload: TogglePayload): Promise<TogglePayload> => {
      const { error } = await supabase
        .from('job_user_state')
        .upsert(
          { user_id: user!.id, job_id: payload.id, read: payload.read },
          { onConflict: 'user_id,job_id' }
        )
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
