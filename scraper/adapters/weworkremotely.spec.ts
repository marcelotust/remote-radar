// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { weworkremotely } from './weworkremotely.ts'

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
      title: 'Senior React Engineer',
      company: 'Acme',
      url: 'https://weworkremotely.com/remote-jobs/acme-senior-react-engineer',
      location: 'Anywhere (100% Remote)',
      description: null,
    })
    expect(jobs[1].company).toBe('Globex')
  })
})
