// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { euremotejobs } from './euremotejobs.ts'

const html = readFileSync(
  fileURLToPath(new URL('./__fixtures__/euremotejobs.html', import.meta.url)),
  'utf8'
)

describe('euremotejobs adapter', () => {
  it('targets the right host', () => {
    expect(euremotejobs.host).toBe('euremotejobs.com')
  })

  it('extracts listings and skips cards missing title/company', () => {
    const jobs = euremotejobs.parse(html)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Software Development Engineer in Test',
      company: 'Kodify Media Group',
      url: 'https://euremotejobs.com/job/kodify-media-group-europe-full-time-software-development-engineer-in-test/',
      location: 'Europe',
      description: null,
    })
    expect(jobs[1].company).toBe('Lemon.io')
    expect(jobs[1].location).toBe('Costa Rica, Europe, LATAM')
  })
})
