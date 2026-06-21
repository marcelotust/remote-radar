import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { useCompanies } from './useCompanies'
import { useAddCompany, useDeleteCompany } from './useCompanyMutations'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useCompanies', () => {
  it('returns the mock companies list', async () => {
    const { result } = renderHook(() => useCompanies(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(3)
    expect(result.current.data?.[0].name).toBe('Stripe')
  })
})

describe('useAddCompany', () => {
  it('adds a company to the cache', async () => {
    const wrapper = makeWrapper()
    const { result: companiesResult } = renderHook(() => useCompanies(), { wrapper })
    await waitFor(() => expect(companiesResult.current.isSuccess).toBe(true))
    const initialLength = companiesResult.current.data!.length

    const { result: addResult } = renderHook(() => useAddCompany(), { wrapper })
    addResult.current.mutate({
      name: 'New Co',
      website: null,
      notes: null,
      remote_brazil: 'unknown',
    })

    await waitFor(() => expect(companiesResult.current.data!.length).toBe(initialLength + 1))
    expect(companiesResult.current.data?.some((c) => c.name === 'New Co')).toBe(true)
  })
})

describe('useDeleteCompany', () => {
  it('removes a company from the cache', async () => {
    const wrapper = makeWrapper()
    const { result: companiesResult } = renderHook(() => useCompanies(), { wrapper })
    await waitFor(() => expect(companiesResult.current.isSuccess).toBe(true))

    const { result: deleteResult } = renderHook(() => useDeleteCompany(), { wrapper })
    deleteResult.current.mutate('c1')

    await waitFor(() =>
      expect(companiesResult.current.data?.some((c) => c.id === 'c1')).toBe(false)
    )
  })
})
