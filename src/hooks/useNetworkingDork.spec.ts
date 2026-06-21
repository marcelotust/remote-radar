import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useNetworkingDork } from './useNetworkingDork'

describe('useNetworkingDork', () => {
  it('returns a google search URL', () => {
    const { result } = renderHook(() => useNetworkingDork('Stripe'))
    expect(result.current).toMatch(/^https:\/\/www\.google\.com\/search/)
  })

  it('includes the company name', () => {
    const { result } = renderHook(() => useNetworkingDork('Stripe'))
    expect(decodeURIComponent(result.current)).toContain('"Stripe"')
  })

  it('updates when company name changes', () => {
    const { result, rerender } = renderHook(
      ({ name }: { name: string }) => useNetworkingDork(name),
      { initialProps: { name: 'Stripe' } }
    )
    rerender({ name: 'Cloudflare' })
    expect(decodeURIComponent(result.current)).toContain('"Cloudflare"')
  })
})
