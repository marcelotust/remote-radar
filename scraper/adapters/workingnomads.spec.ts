// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { workingnomads, parseWorkingNomads } from './workingnomads.ts'

const html = readFileSync(
  fileURLToPath(new URL('./__fixtures__/workingnomads.html', import.meta.url)),
  'utf8'
)

describe('workingnomads adapter', () => {
  it('targets the right host', () => {
    expect(workingnomads.host).toBe('workingnomads.com')
  })

  it('extracts listings with absolute URLs and skips anchors missing a title', () => {
    const jobs = workingnomads.parse(html)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Senior DevOps Engineer',
      company: 'Lemon.io',
      url: 'https://www.workingnomads.com/jobs/senior-devops-engineer-lemonio-1685353',
      location: null,
      description: null,
      published_at: '2026-06-18T00:00:00.000Z',
    })
    expect(jobs[1].company).toBe('StubGroup')
  })

  it('extracts <time datetime> as published_at, null when absent', () => {
    const jobs = parseWorkingNomads(html)
    expect(jobs[0].published_at).toBe('2026-06-18T00:00:00.000Z')
    expect(jobs[1].published_at).toBeNull()
  })
})
