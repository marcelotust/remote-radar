import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseJsonLd } from './generic.ts'

// @vitest-environment node

const html = readFileSync(
  fileURLToPath(new URL('./__fixtures__/jsonld.html', import.meta.url)),
  'utf8'
)

describe('parseJsonLd', () => {
  it('extracts remote JobPosting entries and ignores non-jobs', () => {
    const jobs = parseJsonLd(html)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Senior Frontend Engineer',
      company: 'Acme Inc',
      url: 'https://example.com/jobs/frontend',
      location: 'Remote, BR',
      description: 'Build React and TypeScript apps. Remote friendly.',
      published_at: '2026-06-12T00:00:00.000Z',
    })
    expect(jobs[1]).toMatchObject({
      title: 'Backend Engineer',
      company: 'Beta Corp',
      url: 'https://example.com/jobs/backend',
    })
  })

  it('returns [] when there is no JSON-LD', () => {
    expect(parseJsonLd('<html><body>nothing</body></html>')).toEqual([])
  })

  it('extracts datePosted as published_at, null when absent', () => {
    const jobs = parseJsonLd(html)
    expect(jobs.some((j) => j.published_at === '2026-06-12T00:00:00.000Z')).toBe(true)
    const dateless = jobs.find((j) => j.title === 'Backend Engineer')
    expect(dateless?.published_at).toBeNull()
  })

  it('accepts a posting via schema.org jobLocationType: TELECOMMUTE regardless of title text', () => {
    const jobs = parseJsonLd(html)
    expect(jobs.some((j) => j.title === 'Backend Engineer')).toBe(true)
  })

  it('accepts a posting whose location text says Remote', () => {
    const jobs = parseJsonLd(html)
    expect(jobs.some((j) => j.title === 'Senior Frontend Engineer')).toBe(true)
  })

  it('drops a posting whose title says Hybrid, even with no other remote cue', () => {
    const jobs = parseJsonLd(html)
    expect(jobs.some((j) => j.title === 'Hybrid Product Designer')).toBe(false)
  })

  it('drops a posting with no remote/hybrid/onsite cue at all (ambiguous default)', () => {
    const jobs = parseJsonLd(html)
    expect(jobs.some((j) => j.title === 'Office Manager')).toBe(false)
  })
})
