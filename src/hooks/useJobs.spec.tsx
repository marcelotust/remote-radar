import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { useJobs } from './useJobs'
import { useUpdateJobStatus } from './useUpdateJobStatus'
import { useToggleJobRead } from './useToggleJobRead'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useJobs', () => {
  it('returns enriched jobs with relevance_score', async () => {
    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const jobs = result.current.data!
    expect(jobs.length).toBe(3)
    jobs.forEach((j) => {
      expect(j.relevance_score).toBeDefined()
      expect(j.relevance_level).toBeDefined()
    })
  })

  it('marks stripe job as wishlist company', async () => {
    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const stripeJob = result.current.data!.find((j) => j.company === 'Stripe')
    expect(stripeJob?.is_wishlist_company).toBe(true)
    expect(stripeJob?.wishlist_remote_brazil).toBe('yes')
  })

  it('sorts jobs by relevance_score descending', async () => {
    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const scores = result.current.data!.map((j) => j.relevance_score ?? 0)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })
})

describe('useUpdateJobStatus', () => {
  it('optimistically updates job status in cache', async () => {
    const wrapper = makeWrapper()
    const { result: jobsResult } = renderHook(() => useJobs(), { wrapper })
    await waitFor(() => expect(jobsResult.current.isSuccess).toBe(true))

    const { result: mutResult } = renderHook(() => useUpdateJobStatus(), { wrapper })
    mutResult.current.mutate({ id: 'j1', status: 'applied' })

    await waitFor(() => {
      const updated = jobsResult.current.data?.find((j) => j.id === 'j1')
      expect(updated?.status).toBe('applied')
    })
  })
})

describe('useToggleJobRead', () => {
  it('optimistically marks an unread job as read', async () => {
    const wrapper = makeWrapper()
    const { result: jobsResult } = renderHook(() => useJobs(), { wrapper })
    await waitFor(() => expect(jobsResult.current.isSuccess).toBe(true))
    expect(jobsResult.current.data?.find((j) => j.id === 'j1')?.read).toBe(false)

    const { result: mutResult } = renderHook(() => useToggleJobRead(), { wrapper })
    mutResult.current.mutate({ id: 'j1', read: true })

    await waitFor(() => {
      const updated = jobsResult.current.data?.find((j) => j.id === 'j1')
      expect(updated?.read).toBe(true)
    })
  })

  it('can mark a read job as unread', async () => {
    const wrapper = makeWrapper()
    const { result: jobsResult } = renderHook(() => useJobs(), { wrapper })
    await waitFor(() => expect(jobsResult.current.isSuccess).toBe(true))
    expect(jobsResult.current.data?.find((j) => j.id === 'j3')?.read).toBe(true)

    const { result: mutResult } = renderHook(() => useToggleJobRead(), { wrapper })
    mutResult.current.mutate({ id: 'j3', read: false })

    await waitFor(() => {
      const updated = jobsResult.current.data?.find((j) => j.id === 'j3')
      expect(updated?.read).toBe(false)
    })
  })
})
