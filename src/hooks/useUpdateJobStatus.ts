import { useMutation, useQueryClient } from '@tanstack/react-query'
import { JOBS_KEY } from './useJobs'
import type { Job, JobStatus } from '../types'

interface UpdatePayload {
  id: string
  status: JobStatus
}

export const useUpdateJobStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdatePayload): Promise<UpdatePayload> => payload,
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
  })
}
