import { describe, it, expect } from 'vitest'
import { applyFilters } from './inboxFilters'
import type { Job, FilterState } from '../types'

const base: FilterState = {
  status: 'all',
  relevance: 'all',
  unreadOnly: false,
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
})
