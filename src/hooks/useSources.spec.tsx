import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { useSources } from './useSources'
import { useAddSource, useDeleteSource } from './useSourceMutations'
import { AuthProvider } from '../contexts/AuthContext'
import { __setSupabaseSession } from '../lib/__mocks__/supabase'
import { MOCK_SOURCES } from '../data/mockData'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </AuthProvider>
  )
}

describe('useSources', () => {
  it('returns the seeded sources list', async () => {
    const { result } = renderHook(() => useSources(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(MOCK_SOURCES.length)
    expect(result.current.data?.some((s) => s.label === 'Lever Jobs')).toBe(true)
    expect(result.current.data?.some((s) => s.label === 'Remote OK')).toBe(true)
  })
})

describe('useAddSource', () => {
  it('adds a source to the cache', async () => {
    const wrapper = makeWrapper()
    const { result: sourcesResult } = renderHook(() => useSources(), { wrapper })
    await waitFor(() => expect(sourcesResult.current.isSuccess).toBe(true))
    const initialLength = sourcesResult.current.data!.length

    const { result: addResult } = renderHook(() => useAddSource(), { wrapper })
    addResult.current.mutate({ url: 'https://example.com', label: 'Example', is_active: true })

    await waitFor(() => expect(sourcesResult.current.data!.length).toBe(initialLength + 1))
  })

  it('stamps created_by and created_by_email from the current session', async () => {
    __setSupabaseSession({ user: { id: 'u1', email: 'me@example.com' }, access_token: 'x' })
    const wrapper = makeWrapper()
    // Same tree for both hooks so useAddSource sees the session that has
    // already resolved by the time useSources succeeds.
    const { result } = renderHook(() => ({ sources: useSources(), add: useAddSource() }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.sources.isSuccess).toBe(true))

    result.current.add.mutate({ url: 'https://example.org', label: 'Mine', is_active: true })

    await waitFor(() => {
      const added = result.current.sources.data!.find((s) => s.label === 'Mine')
      expect(added?.created_by).toBe('u1')
      expect(added?.created_by_email).toBe('me@example.com')
    })
  })
})

describe('useDeleteSource', () => {
  it('removes a source from the cache', async () => {
    const wrapper = makeWrapper()
    const { result: sourcesResult } = renderHook(() => useSources(), { wrapper })
    await waitFor(() => expect(sourcesResult.current.isSuccess).toBe(true))

    const { result: deleteResult } = renderHook(() => useDeleteSource(), { wrapper })
    deleteResult.current.mutate('s1')

    await waitFor(() => expect(sourcesResult.current.data?.some((s) => s.id === 's1')).toBe(false))
  })
})
