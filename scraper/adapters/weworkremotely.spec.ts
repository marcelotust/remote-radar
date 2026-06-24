// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { weworkremotely, parseWeWorkRemotely } from './weworkremotely.ts'

const html = readFileSync(
  fileURLToPath(new URL('./__fixtures__/weworkremotely.html', import.meta.url)),
  'utf8'
)

describe('weworkremotely adapter', () => {
  it('targets the right host', () => {
    expect(weworkremotely.host).toBe('weworkremotely.com')
  })

  it('extracts listings with absolute URLs and skips non-job links', () => {
    const jobs = weworkremotely.parse(html)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Senior Fullstack Developer (Python)',
      company: 'Proxify AB',
      url: 'https://weworkremotely.com/remote-jobs/proxify-ab-senior-fullstack-developer-python-3',
      location: 'Sweden',
      description: null,
      published_at: '2026-06-18T00:00:00.000Z',
    })
    expect(jobs[1].company).toBe('Nomad')
  })

  it('extracts <time datetime> as published_at, null when absent', () => {
    const jobs = parseWeWorkRemotely(html)
    expect(jobs[0].published_at).toBe('2026-06-18T00:00:00.000Z')
    expect(jobs[1].published_at).toBeNull()
  })
})
