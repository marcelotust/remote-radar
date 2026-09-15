import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { useScoringConfig } from './useScoringConfig'
import { useReplaceScoringKeywords, useUpdateScoringSettings } from './useScoringConfigMutations'
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

describe('useScoringConfig', () => {
  it('falls back to the global config when the user has none of their own', async () => {
    const { result } = renderHook(() => useScoringConfig(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const config = result.current.data!
    expect(config.highThreshold).toBe(4)
    expect(config.mediumThreshold).toBe(1)
    const react = config.keywords.find((k) => k.term === 'react')
    expect(react).toMatchObject({ weight: 2, is_veto: false })
    const java = config.keywords.find((k) => k.term === 'java')
    expect(java).toMatchObject({ is_veto: true })
  })

  it('prefers the user’s own keywords once they have saved any', async () => {
    const wrapper = makeWrapper()
    const { result } = renderHook(
      () => ({ cfg: useScoringConfig(), rep: useReplaceScoringKeywords() }),
      {
        wrapper,
      }
    )
    await waitFor(() => expect(result.current.cfg.isSuccess).toBe(true))

    result.current.rep.mutate([{ term: 'svelte', weight: 2, is_veto: false }])

    await waitFor(() => {
      const terms = result.current.cfg.data!.keywords.map((k) => k.term)
      expect(terms).toEqual(['svelte'])
    })
  })

  it('prefers the user’s own thresholds once they have saved any', async () => {
    const wrapper = makeWrapper()
    const { result } = renderHook(
      () => ({ cfg: useScoringConfig(), upd: useUpdateScoringSettings() }),
      {
        wrapper,
      }
    )
    await waitFor(() => expect(result.current.cfg.isSuccess).toBe(true))

    result.current.upd.mutate({ high_threshold: 10, medium_threshold: 5 })

    await waitFor(() => expect(result.current.cfg.data!.highThreshold).toBe(10))
    expect(result.current.cfg.data!.mediumThreshold).toBe(5)
  })
})
