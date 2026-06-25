import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { useScoringConfig } from './useScoringConfig'
import {
  useAddScoringKeyword,
  useDeleteScoringKeyword,
  useEditScoringKeyword,
  useUpdateScoringSettings,
} from './useScoringConfigMutations'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useAddScoringKeyword', () => {
  it('adds a keyword to the cached config', async () => {
    const wrapper = makeWrapper()
    const { result: cfg } = renderHook(() => useScoringConfig(), { wrapper })
    await waitFor(() => expect(cfg.current.isSuccess).toBe(true))
    const initial = cfg.current.data!.keywords.length

    const { result: add } = renderHook(() => useAddScoringKeyword(), { wrapper })
    add.current.mutate({ term: 'svelte', weight: 1, is_veto: false })

    await waitFor(() => expect(cfg.current.data!.keywords.length).toBe(initial + 1))
    expect(cfg.current.data!.keywords.some((k) => k.term === 'svelte')).toBe(true)
  })
})

describe('useEditScoringKeyword', () => {
  it('updates a keyword in the cached config', async () => {
    const wrapper = makeWrapper()
    const { result: cfg } = renderHook(() => useScoringConfig(), { wrapper })
    await waitFor(() => expect(cfg.current.isSuccess).toBe(true))
    const node = cfg.current.data!.keywords.find((k) => k.term === 'node')! as unknown as {
      id: string
    } & Record<string, unknown>

    const { result: edit } = renderHook(() => useEditScoringKeyword(), { wrapper })
    edit.current.mutate({ ...node, weight: 2 } as never)

    await waitFor(() =>
      expect(cfg.current.data!.keywords.find((k) => k.term === 'node')!.weight).toBe(2)
    )
  })
})

describe('useDeleteScoringKeyword', () => {
  it('removes a keyword from the cached config', async () => {
    const wrapper = makeWrapper()
    const { result: cfg } = renderHook(() => useScoringConfig(), { wrapper })
    await waitFor(() => expect(cfg.current.isSuccess).toBe(true))
    const node = cfg.current.data!.keywords.find((k) => k.term === 'node') as unknown as {
      id: string
    }

    const { result: del } = renderHook(() => useDeleteScoringKeyword(), { wrapper })
    del.current.mutate(node.id)

    await waitFor(() =>
      expect(cfg.current.data!.keywords.some((k) => k.term === 'node')).toBe(false)
    )
  })
})

describe('useUpdateScoringSettings', () => {
  it('updates thresholds in the cached config', async () => {
    const wrapper = makeWrapper()
    const { result: cfg } = renderHook(() => useScoringConfig(), { wrapper })
    await waitFor(() => expect(cfg.current.isSuccess).toBe(true))

    const { result: upd } = renderHook(() => useUpdateScoringSettings(), { wrapper })
    upd.current.mutate({ high_threshold: 6, medium_threshold: 2 })

    await waitFor(() => expect(cfg.current.data!.highThreshold).toBe(6))
    expect(cfg.current.data!.mediumThreshold).toBe(2)
  })
})
