// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isRemoteJobLocationType, looksRemote } from './remoteFilter.ts'

describe('isRemoteJobLocationType', () => {
  it('matches schema.org TELECOMMUTE (any case)', () => {
    expect(isRemoteJobLocationType('TELECOMMUTE')).toBe(true)
    expect(isRemoteJobLocationType('telecommute')).toBe(true)
  })

  it('matches when TELECOMMUTE is one of several values', () => {
    expect(isRemoteJobLocationType(['ONSITE', 'TELECOMMUTE'])).toBe(true)
  })

  it('is false for other values, arrays without it, or missing/malformed input', () => {
    expect(isRemoteJobLocationType('ONSITE')).toBe(false)
    expect(isRemoteJobLocationType(['ONSITE', 'HYBRID'])).toBe(false)
    expect(isRemoteJobLocationType(undefined)).toBe(false)
    expect(isRemoteJobLocationType(null)).toBe(false)
    expect(isRemoteJobLocationType(42)).toBe(false)
  })
})

describe('looksRemote', () => {
  it('matches an explicit "remote" mention in the title', () => {
    expect(looksRemote({ title: 'Senior Backend Engineer (Remote)', location: null })).toBe(true)
  })

  it('matches "work from anywhere" / "100% remote" / "remote-first" phrasing', () => {
    expect(looksRemote({ title: 'Engineer', location: 'Work From Anywhere' })).toBe(true)
    expect(looksRemote({ title: '100% Remote Designer', location: null })).toBe(true)
    expect(looksRemote({ title: 'Remote-First Product Manager', location: null })).toBe(true)
  })

  it('matches when the location field itself says Remote', () => {
    expect(looksRemote({ title: 'Backend Engineer', location: 'Remote, BR' })).toBe(true)
  })

  it('rejects hybrid/on-site/in-office even when combined with other text', () => {
    expect(looksRemote({ title: 'Hybrid Software Engineer', location: 'New York, NY' })).toBe(false)
    expect(looksRemote({ title: 'On-site Support Engineer', location: null })).toBe(false)
    expect(looksRemote({ title: 'Onsite Recruiter', location: null })).toBe(false)
    expect(looksRemote({ title: 'Engineer', location: 'In-office, São Paulo' })).toBe(false)
  })

  it('denies over allow when both a remote and a hybrid/on-site cue are present', () => {
    expect(looksRemote({ title: 'Remote-Friendly Hybrid Engineer', location: null })).toBe(false)
  })

  it('defaults to false when neither an allow nor a deny cue is present (ambiguous)', () => {
    expect(looksRemote({ title: 'Backend Engineer', location: 'New York, NY' })).toBe(false)
    expect(looksRemote({ title: 'Backend Engineer', location: null })).toBe(false)
  })

  it('only looks at title and location — the type signature excludes description on purpose', () => {
    // A long description mentioning "remote teams" elsewhere in the company
    // shouldn't flip an onsite title into a remote job, and vice versa, so
    // looksRemote's parameter type doesn't even accept a description field.
    expect(looksRemote({ title: 'Office Manager', location: 'Austin, TX' })).toBe(false)
  })
})
