// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseGithubIssues, extractTitleAndCompany } from './github.ts'

const json = readFileSync(
  fileURLToPath(new URL('./__fixtures__/github-issues.json', import.meta.url)),
  'utf8'
)

describe('extractTitleAndCompany', () => {
  it('splits on " na " preferentially', () => {
    expect(extractTitleAndCompany('[Remoto] Product Owner na BotCity')).toEqual({
      title: 'Product Owner',
      company: 'BotCity',
    })
  })

  it('keeps role text before " na " intact when it contains pipes', () => {
    expect(extractTitleAndCompany('[Remoto] Fullstack (React) | Sênior na Sensedia')).toEqual({
      title: 'Fullstack (React) | Sênior',
      company: 'Sensedia',
    })
  })

  it('falls back to a dash separator when there is no " na "', () => {
    expect(extractTitleAndCompany('[100% Remoto] Full-Stack Sênior - Igma')).toEqual({
      title: 'Full-Stack Sênior',
      company: 'Igma',
    })
  })

  it('uses the em dash placeholder when no separator matches', () => {
    expect(extractTitleAndCompany('[Remoto] Vaga sem empresa clara')).toEqual({
      title: 'Vaga sem empresa clara',
      company: '—',
    })
  })
})

describe('parseGithubIssues', () => {
  it('skips pull requests and maps issues to RawJob', () => {
    const jobs = parseGithubIssues(json)
    expect(jobs).toHaveLength(4)
    expect(jobs[0]).toEqual({
      title: 'Product Owner',
      company: 'BotCity',
      url: 'https://github.com/frontendbr/vagas/issues/8511',
      location: 'Remoto',
      description: 'Vaga de PO totalmente remota.',
    })
    expect(jobs.map((j) => j.url)).not.toContain('https://github.com/frontendbr/vagas/pull/8399')
  })

  it('maps null/empty body to null description', () => {
    const jobs = parseGithubIssues(json)
    expect(jobs[1].description).toBeNull() // body: null
    expect(jobs[3].description).toBeNull() // body: ""
  })

  it('returns [] for non-array / invalid JSON', () => {
    expect(parseGithubIssues('not json')).toEqual([])
    expect(parseGithubIssues('{}')).toEqual([])
  })
})
