import { describe, it, expect } from 'vitest'
import { listedAt, isNewJob, NEW_JOB_DAYS } from './jobDates'

const NOW = Date.parse('2026-10-27T12:00:00Z')
const daysAgo = (days: number) => new Date(NOW - days * 86_400_000).toISOString()
const job = (over: { listed_at?: string; posted_at?: string | null; scraped_at?: string }) => ({
  posted_at: null,
  scraped_at: daysAgo(0),
  ...over,
})

describe('listedAt', () => {
  it('prefers listed_at, then posted_at, then scraped_at', () => {
    expect(listedAt(job({ listed_at: 'L', posted_at: 'P', scraped_at: 'S' }))).toBe('L')
    expect(listedAt(job({ posted_at: 'P', scraped_at: 'S' }))).toBe('P')
    expect(listedAt(job({ scraped_at: 'S' }))).toBe('S')
  })
})

describe('isNewJob', () => {
  it('is new inside the window and not after it', () => {
    expect(isNewJob(job({ posted_at: daysAgo(NEW_JOB_DAYS - 1) }), NOW)).toBe(true)
    expect(isNewJob(job({ posted_at: daysAgo(NEW_JOB_DAYS + 1) }), NOW)).toBe(false)
  })

  it('judges by publication, not by when it was scraped', () => {
    expect(isNewJob(job({ posted_at: daysAgo(40), scraped_at: daysAgo(0) }), NOW)).toBe(false)
  })

  it('falls back to the scrape day when the source has no date', () => {
    expect(isNewJob(job({ scraped_at: daysAgo(2) }), NOW)).toBe(true)
  })

  it('treats an unparseable date as not new', () => {
    expect(isNewJob(job({ scraped_at: 'garbage' }), NOW)).toBe(false)
  })
})
