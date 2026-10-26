import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { useJobs, FEED_PAGE_SIZE, FEED_WINDOW_DAYS, FEED_CLOSED_AFTER_DAYS } from './useJobs'
import { AuthProvider } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { __setSupabaseSession } from '../lib/__mocks__/supabase'
import { MOCK_USER_ID } from '../data/mockData'
import type { Job } from '../types'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </AuthProvider>
  )
}

beforeEach(() => {
  __setSupabaseSession({
    user: { id: MOCK_USER_ID, email: 'marcelotust@gmail.com' },
    access_token: 'x',
  })
})

// Which jobs the feed query returns: the publication window, closed jobs and paging.
describe('useJobs feed query', () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

  const insertJob = (over: Partial<Job>) =>
    supabase
      .from('jobs')
      .insert({
        title: 'Seeded Role',
        company: 'Seed Co',
        url: `https://seed/${crypto.randomUUID()}`,
        location: null,
        description: null,
        posted_at: null,
        scraped_at: daysAgo(0),
        source_url: null,
        ...over,
      })
      .select()
      .single()

  it('leaves out jobs scraped before the feed window', async () => {
    await insertJob({ title: 'Stale Role', scraped_at: daysAgo(FEED_WINDOW_DAYS + 1) })
    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data!.map((j) => j.title)).not.toContain('Stale Role')
  })

  it('windows by publication date, not by when the job was scraped', async () => {
    await insertJob({
      title: 'Republished Old Role',
      posted_at: daysAgo(FEED_WINDOW_DAYS + 5),
      scraped_at: daysAgo(0),
    })
    await insertJob({ title: 'Fresh Posted Role', posted_at: daysAgo(2), scraped_at: daysAgo(0) })
    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const titles = result.current.data!.map((j) => j.title)
    expect(titles).toContain('Fresh Posted Role')
    expect(titles).not.toContain('Republished Old Role')
  })

  it('hides a job the scraper has stopped seeing, unless the user applied to it', async () => {
    const stale = daysAgo(FEED_CLOSED_AFTER_DAYS + 2)
    await insertJob({ title: 'Closed Role', last_seen_at: stale })
    const { data } = await insertJob({ title: 'Closed Applied Role', last_seen_at: stale })
    await supabase.from('job_user_state').insert({
      user_id: MOCK_USER_ID,
      job_id: (data as { id: string }).id,
      status: 'applied',
    })
    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const titles = result.current.data!.map((j) => j.title)
    expect(titles).not.toContain('Closed Role')
    expect(titles).toContain('Closed Applied Role')
  })

  it('keeps an applied job after it ages out of the window', async () => {
    const { data } = await insertJob({
      title: 'Old Applied Role',
      scraped_at: daysAgo(FEED_WINDOW_DAYS + 10),
    })
    await supabase.from('job_user_state').insert({
      user_id: MOCK_USER_ID,
      job_id: (data as { id: string }).id,
      status: 'applied',
      read: true,
    })
    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const old = result.current.data!.find((j) => j.title === 'Old Applied Role')
    expect(old?.status).toBe('applied')
  })

  it('pages past the per-response row cap instead of truncating', async () => {
    await supabase.from('jobs').insert(
      Array.from({ length: FEED_PAGE_SIZE + 5 }, (_, i) => ({
        title: `Bulk Role ${i}`,
        company: 'Bulk Co',
        url: `https://bulk/${i}`,
        location: null,
        description: null,
        posted_at: null,
        scraped_at: daysAgo(1),
        source_url: null,
      }))
    )
    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // 3 seeded mock jobs + every bulk row
    expect(result.current.data!).toHaveLength(3 + FEED_PAGE_SIZE + 5)
  })
})
