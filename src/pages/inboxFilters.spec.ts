import { describe, it, expect } from 'vitest'
import { applyFilters } from './inboxFilters'
import type { Job, FilterState } from '../types'

const base: FilterState = {
  status: 'all',
  relevance: 'all',
  unreadOnly: false,
  newOnly: false,
}

const job = (over: Partial<Job>): Job => ({
  id: '1',
  title: 't',
  company: 'c',
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

describe('applyFilters (inbox)', () => {
  it('hides dismissed jobs when status is "all"', () => {
    const jobs = [job({ id: 'a' }), job({ id: 'b', status: 'dismissed' })]
    expect(applyFilters(jobs, base).map((j) => j.id)).toEqual(['a'])
  })

  it('filters by relevance level', () => {
    const jobs = [
      job({ id: 'a', relevance_level: 'high' }),
      job({ id: 'b', relevance_level: 'low' }),
    ]
    expect(applyFilters(jobs, { ...base, relevance: 'high' }).map((j) => j.id)).toEqual(['a'])
  })

  it('respects unreadOnly', () => {
    const jobs = [job({ id: 'a', read: false }), job({ id: 'b', read: true })]
    expect(applyFilters(jobs, { ...base, unreadOnly: true }).map((j) => j.id)).toEqual(['a'])
  })

  it('keeps only jobs published in the last week when newOnly is on', () => {
    const now = Date.now()
    const jobs = [
      job({ id: 'fresh', posted_at: new Date(now - 2 * 86_400_000).toISOString() }),
      job({ id: 'old', posted_at: new Date(now - 30 * 86_400_000).toISOString() }),
    ]
    expect(applyFilters(jobs, { ...base, newOnly: true }).map((j) => j.id)).toEqual(['fresh'])
  })
})
