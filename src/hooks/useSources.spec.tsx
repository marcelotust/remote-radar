import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { useSources } from './useSources'
import { useAddSource, useDeleteSource } from './useSourceMutations'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useSources', () => {
  it('returns the mock sources list', async () => {
    const { result } = renderHook(() => useSources(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
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
