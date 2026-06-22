import { describe, it, expect } from 'vitest'
import { resolveAdapter } from './index.ts'

describe('resolveAdapter', () => {
  it('matches a known host (ignoring www.)', () => {
    expect(resolveAdapter('https://www.weworkremotely.com/remote-jobs').host).toBe(
      'weworkremotely.com'
    )
  })

  it('falls back to the generic adapter for unknown hosts', () => {
    expect(resolveAdapter('https://remoteok.com').host).toBe('*')
  })

  it('falls back to generic for invalid URLs', () => {
    expect(resolveAdapter('not a url').host).toBe('*')
  })
})
