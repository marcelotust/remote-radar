import { describe, it, expect } from 'vitest'
import { buildDorkUrl } from './dorkUrl'

describe('buildDorkUrl', () => {
  it('returns a google.com search URL', () => {
    const url = buildDorkUrl('Stripe')
    expect(url).toMatch(/^https:\/\/www\.google\.com\/search\?q=/)
  })

  it('includes the company name in the query', () => {
    const url = buildDorkUrl('Stripe')
    expect(decodeURIComponent(url)).toContain('"Stripe"')
  })

  it('includes linkedin.com/in in the query', () => {
    const url = buildDorkUrl('Stripe')
    expect(decodeURIComponent(url)).toContain('site:linkedin.com/in')
  })

  it('includes Brasil in the query', () => {
    const url = buildDorkUrl('Stripe')
    expect(decodeURIComponent(url)).toContain('"Brasil"')
  })

  it('handles company names with special characters', () => {
    const url = buildDorkUrl('Acme & Co.')
    expect(url).not.toContain(' ')
    expect(url).toMatch(/^https:\/\/www\.google\.com\/search\?q=/)
  })
})
