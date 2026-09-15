import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { JOBS_KEY } from './useJobs'
import type { Job, JobStatus } from '../types'

interface UpdatePayload {
  id: string
  status: JobStatus
}

export const useUpdateJobStatus = () => {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (payload: UpdatePayload): Promise<UpdatePayload> => {
      const { error } = await supabase
        .from('job_user_state')
        .upsert(
          { user_id: user!.id, job_id: payload.id, status: payload.status },
          { onConflict: 'user_id,job_id' }
        )
      if (error) throw error
      return payload
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: JOBS_KEY })
      const previous = qc.getQueryData<Job[]>(JOBS_KEY)
      qc.setQueryData<Job[]>(
        JOBS_KEY,
        (old) => old?.map((j) => (j.id === id ? { ...j, status } : j)) ?? []
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
