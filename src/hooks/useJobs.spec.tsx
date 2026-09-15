import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { useJobs, enrichJobs } from './useJobs'
import { useUpdateJobStatus } from './useUpdateJobStatus'
import { useToggleJobRead } from './useToggleJobRead'
import { useUpdateScoringSettings } from './useScoringConfigMutations'
import { AuthProvider } from '../contexts/AuthContext'
import { __setSupabaseSession } from '../lib/__mocks__/supabase'
import type { Job, Company } from '../types'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </AuthProvider>
  )
}

beforeEach(() => {
  __setSupabaseSession({ user: { id: 'u1', email: 'marcelotust@gmail.com' }, access_token: 'x' })
})

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

  it('recomputes job scores when the scoring config changes', async () => {
    const wrapper = makeWrapper()
    // Same tree for both hooks so the settings mutation sees the session
    // that has already resolved by the time useJobs succeeds.
    const { result } = renderHook(() => ({ jobs: useJobs(), upd: useUpdateScoringSettings() }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.jobs.isSuccess).toBe(true))
    const stripeBefore = result.current.jobs.data!.find((j) => j.company === 'Stripe')!
    // react(2)+typescript(2)+next.js(1) = 5 → high with default high_threshold=4
    expect(stripeBefore.relevance_level).toBe('high')

    result.current.upd.mutate({ high_threshold: 99, medium_threshold: 1 })

    await waitFor(() => {
      const stripeAfter = result.current.jobs.data!.find((j) => j.company === 'Stripe')!
      expect(stripeAfter.relevance_level).toBe('medium')
    })
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

    // onSettled triggers a background invalidate/refetch; the Supabase fake
    // persists the update, so the status stays 'applied' after the refetch.
    await waitFor(() => expect(mutResult.current.isSuccess).toBe(true))
    expect(jobsResult.current.data?.find((j) => j.id === 'j1')?.status).toBe('applied')
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

const baseJob = (over: Partial<Job>): Job => ({
  id: 'j',
  title: 'Dev',
  company: 'X',
  url: 'u',
  location: null,
  description: null,
  posted_at: null,
  scraped_at: '',
  status: 'none',
  read: false,
  source_url: null,
  ...over,
})

describe('enrichJobs', () => {
  it('always recomputes the score from the config, ignoring any stored score', () => {
    const job = baseJob({
      title: 'React TypeScript Remote',
      relevance_score: 99,
      relevance_level: 'low',
    })
    const [out] = enrichJobs([job], [])
    // react(2) + typescript(2) + remote(2) = 6 with DEFAULT_SCORING_CONFIG
    expect(out.relevance_score).toBe(6)
    expect(out.relevance_level).toBe('high')
  })

  it('flags wishlist companies', () => {
    const job = baseJob({ company: 'Stripe' })
    const companies: Company[] = [
      { id: 'c', name: 'Stripe', website: null, notes: null, remote_brazil: 'yes', created_at: '' },
    ]
    const [out] = enrichJobs([job], companies)
    expect(out.is_wishlist_company).toBe(true)
    expect(out.wishlist_remote_brazil).toBe('yes')
  })

  it('orders by scraped_at descending (newest first)', () => {
    const older = baseJob({ id: 'old', scraped_at: '2026-06-01T00:00:00Z' })
    const newer = baseJob({ id: 'new', scraped_at: '2026-06-10T00:00:00Z' })
    const out = enrichJobs([older, newer], [])
    expect(out.map((j) => j.id)).toEqual(['new', 'old'])
  })

  it('breaks scraped_at ties by relevance_score descending', () => {
    // same scraped_at; titles give different computed relevance
    const lowScore = baseJob({ id: 'low', title: 'Manager', scraped_at: '2026-06-05T00:00:00Z' })
    const highScore = baseJob({
      id: 'high',
      title: 'React TypeScript Remote Engineer',
      scraped_at: '2026-06-05T00:00:00Z',
    })
    const out = enrichJobs([lowScore, highScore], [])
    expect(out.map((j) => j.id)).toEqual(['high', 'low'])
  })
})
