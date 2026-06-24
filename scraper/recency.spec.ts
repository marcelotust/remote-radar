import { describe, it, expect } from 'vitest'
import { RECENCY_DAYS, recencyCutoffIso, isRecent } from './recency.ts'

describe('recencyCutoffIso', () => {
  it('returns an ISO timestamp RECENCY_DAYS before now', () => {
    const now = new Date('2026-06-24T00:00:00.000Z')
    expect(recencyCutoffIso(now)).toBe('2026-04-25T00:00:00.000Z')
  })

  it('defaults to the current time', () => {
    expect(typeof recencyCutoffIso()).toBe('string')
  })

  it('uses a 60-day window', () => {
    expect(RECENCY_DAYS).toBe(60)
  })
})

describe('isRecent', () => {
  const cutoff = '2026-04-25T00:00:00.000Z'

  it('keeps a job dated on/after the cutoff', () => {
    expect(isRecent('2026-06-01T00:00:00.000Z', cutoff)).toBe(true)
    expect(isRecent(cutoff, cutoff)).toBe(true)
  })

  it('drops a job dated before the cutoff', () => {
    expect(isRecent('2026-01-01T00:00:00.000Z', cutoff)).toBe(false)
  })

  it('keeps a job with no date (null or undefined)', () => {
    expect(isRecent(null, cutoff)).toBe(true)
    expect(isRecent(undefined, cutoff)).toBe(true)
  })
})
