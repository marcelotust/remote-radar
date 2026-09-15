import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { useScoringConfig } from './useScoringConfig'
import {
  useAddScoringKeyword,
  useDeleteScoringKeyword,
  useEditScoringKeyword,
  useReplaceScoringKeywords,
  useUpdateScoringSettings,
} from './useScoringConfigMutations'
import { AuthProvider } from '../contexts/AuthContext'
import { __setSupabaseSession } from '../lib/__mocks__/supabase'

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
    // Same tree for both hooks so the mutation sees the session that has
    // already resolved by the time useScoringConfig succeeds.
    const { result } = renderHook(
      () => ({ cfg: useScoringConfig(), upd: useUpdateScoringSettings() }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.cfg.isSuccess).toBe(true))

    result.current.upd.mutate({ high_threshold: 6, medium_threshold: 2 })

    await waitFor(() => expect(result.current.cfg.data!.highThreshold).toBe(6))
    expect(result.current.cfg.data!.mediumThreshold).toBe(2)
  })
})

describe('useReplaceScoringKeywords', () => {
  it('replaces the whole keyword set', async () => {
    const wrapper = makeWrapper()
    const { result } = renderHook(
      () => ({ cfg: useScoringConfig(), rep: useReplaceScoringKeywords() }),
      { wrapper }
    )
    await waitFor(() => expect(result.current.cfg.isSuccess).toBe(true))

    result.current.rep.mutate([
      { term: 'svelte', weight: 2, is_veto: false },
      { term: 'cobol', weight: 0, is_veto: true },
    ])

    await waitFor(() => {
      const terms = result.current.cfg.data!.keywords.map((k) => k.term).sort()
      expect(terms).toEqual(['cobol', 'svelte'])
    })
    const svelte = result.current.cfg.data!.keywords.find((k) => k.term === 'svelte')!
    expect(svelte).toMatchObject({ weight: 2, is_veto: false })
    const cobol = result.current.cfg.data!.keywords.find((k) => k.term === 'cobol')!
    expect(cobol).toMatchObject({ is_veto: true })
  })
})
