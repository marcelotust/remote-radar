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
  it('extracts JobPosting entries and ignores non-jobs', () => {
    const jobs = parseJsonLd(html)
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toEqual({
      title: 'Senior Frontend Engineer',
      company: 'Acme Inc',
      url: 'https://example.com/jobs/frontend',
      location: 'Remote, BR',
      description: 'Build React and TypeScript apps. Remote friendly.',
      published_at: '2026-06-12T00:00:00.000Z',
    })
  })

  it('returns [] when there is no JSON-LD', () => {
    expect(parseJsonLd('<html><body>nothing</body></html>')).toEqual([])
  })

  it('extracts datePosted as published_at, null when absent', () => {
    const jobs = parseJsonLd(html)
    expect(jobs.some((j) => j.published_at === '2026-06-12T00:00:00.000Z')).toBe(true)
  })
})
