import { describe, it, expect } from 'vitest'
import { relativeDate } from './relativeDate'

const now = new Date('2026-06-30T12:00:00Z')
// build an ISO string `d` whole days before `now` (at 00:00 to avoid hour drift)
const daysAgo = (d: number) => {
  const base = new Date('2026-06-30T00:00:00Z')
  base.setUTCDate(base.getUTCDate() - d)
  return base.toISOString()
}

describe('relativeDate', () => {
  it('returns "hoje" for today (and future)', () => {
    expect(relativeDate(daysAgo(0), now)).toBe('hoje')
    expect(relativeDate('2026-07-05T00:00:00Z', now)).toBe('hoje')
  })
  it('returns "ontem" for 1 day', () => {
    expect(relativeDate(daysAgo(1), now)).toBe('ontem')
  })
  it('returns "há N dias" for 2..6 days', () => {
    expect(relativeDate(daysAgo(2), now)).toBe('há 2 dias')
    expect(relativeDate(daysAgo(6), now)).toBe('há 6 dias')
  })
  it('returns "semana passada" for 7..13 days', () => {
    expect(relativeDate(daysAgo(7), now)).toBe('semana passada')
    expect(relativeDate(daysAgo(13), now)).toBe('semana passada')
  })
  it('returns "há N semanas" for 14..29 days', () => {
    expect(relativeDate(daysAgo(14), now)).toBe('há 2 semanas')
    expect(relativeDate(daysAgo(29), now)).toBe('há 4 semanas')
  })
  it('returns months for >= 30 days, singular at 1 month', () => {
    expect(relativeDate(daysAgo(30), now)).toBe('há 1 mês')
    expect(relativeDate(daysAgo(75), now)).toBe('há 2 meses')
  })
  it('returns "hoje" for an unparseable date', () => {
    expect(relativeDate('not-a-date', now)).toBe('hoje')
  })
})
