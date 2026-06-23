import { describe, it, expect } from 'vitest'
import { applyFilters } from './dashboardFilters'
import type { Job, FilterState } from '../types'

const job = (over: Partial<Job>): Job => ({
  id: 'j',
  title: 'T',
  company: 'C',
  url: 'u',
  location: null,
  description: null,
  posted_at: null,
  scraped_at: '2026-06-20T00:00:00Z',
  status: 'none',
  read: false,
  source_url: null,
  ...over,
})

const filters = (over: Partial<FilterState>): FilterState => ({
  status: 'all',
  relevance: 'all',
  wishlistOnly: false,
  unreadOnly: false,
  ...over,
})

describe('applyFilters', () => {
  it('hides dismissed jobs when status is "all"', () => {
    const jobs = [job({ id: 'a', status: 'none' }), job({ id: 'b', status: 'dismissed' })]
    expect(applyFilters(jobs, filters({})).map((j) => j.id)).toEqual(['a'])
  })

  it('shows only dismissed jobs when status is "dismissed"', () => {
    const jobs = [job({ id: 'a', status: 'none' }), job({ id: 'b', status: 'dismissed' })]
    expect(applyFilters(jobs, filters({ status: 'dismissed' })).map((j) => j.id)).toEqual(['b'])
  })

  it('matches exactly for "none" and "applied"', () => {
    const jobs = [
      job({ id: 'a', status: 'none' }),
      job({ id: 'b', status: 'applied' }),
      job({ id: 'c', status: 'dismissed' }),
    ]
    expect(applyFilters(jobs, filters({ status: 'none' })).map((j) => j.id)).toEqual(['a'])
    expect(applyFilters(jobs, filters({ status: 'applied' })).map((j) => j.id)).toEqual(['b'])
  })

  it('still applies relevance, wishlist, and unread filters', () => {
    const jobs = [
      job({ id: 'a', relevance_level: 'high', is_wishlist_company: true, read: false }),
      job({ id: 'b', relevance_level: 'low', is_wishlist_company: true, read: false }),
      job({ id: 'c', relevance_level: 'high', is_wishlist_company: false, read: true }),
    ]
    expect(applyFilters(jobs, filters({ relevance: 'high' })).map((j) => j.id)).toEqual(['a', 'c'])
    expect(applyFilters(jobs, filters({ wishlistOnly: true })).map((j) => j.id)).toEqual(['a', 'b'])
    expect(applyFilters(jobs, filters({ unreadOnly: true })).map((j) => j.id)).toEqual(['a', 'b'])
  })
})
