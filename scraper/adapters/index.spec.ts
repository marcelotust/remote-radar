import { describe, it, expect } from 'vitest'
import { resolveAdapter } from './index.ts'
import { github } from './github.ts'

describe('resolveAdapter', () => {
  it('matches a known host (ignoring www.)', () => {
    expect(resolveAdapter('https://www.weworkremotely.com/remote-jobs').host).toBe(
      'weworkremotely.com'
    )
  })

  it('resolves the newly registered board hosts', () => {
    expect(resolveAdapter('https://remotive.com/api/remote-jobs').host).toBe('remotive.com')
    expect(resolveAdapter('https://remoteok.com/api').host).toBe('remoteok.com')
    expect(resolveAdapter('https://euremotejobs.com/jobs/').host).toBe('euremotejobs.com')
    expect(resolveAdapter('https://www.workingnomads.com/jobs').host).toBe('workingnomads.com')
  })

  it('falls back to the generic adapter for unknown hosts', () => {
    expect(resolveAdapter('https://example.com').host).toBe('*')
  })

  it('falls back to generic for invalid URLs', () => {
    expect(resolveAdapter('not a url').host).toBe('*')
  })

  it('resolves github.com sources to the github adapter', () => {
    expect(resolveAdapter('https://github.com/frontendbr/vagas')).toBe(github)
    expect(resolveAdapter('https://github.com/backend-br/vagas')).toBe(github)
  })
})
