import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { useScoringConfig } from './useScoringConfig'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useScoringConfig', () => {
  it('resolves keywords and thresholds from Supabase', async () => {
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
})
