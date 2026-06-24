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

import { fetchGithubIssues, filterRecentIssues, github } from './github.ts'

describe('filterRecentIssues', () => {
  const cutoff = '2026-05-01T00:00:00.000Z'

  it('keeps issues created on/after the cutoff and drops older ones', () => {
    const { kept, reachedCutoff } = filterRecentIssues(
      [
        { id: 1, created_at: '2026-06-10T00:00:00Z' },
        { id: 2, created_at: '2026-04-01T00:00:00Z' },
      ],
      cutoff
    )
    expect(kept.map((i) => i.id)).toEqual([1])
    expect(reachedCutoff).toBe(true)
  })

  it('reports reachedCutoff false when all issues are recent', () => {
    const { kept, reachedCutoff } = filterRecentIssues(
      [{ id: 1, created_at: '2026-06-10T00:00:00Z' }],
      cutoff
    )
    expect(kept).toHaveLength(1)
    expect(reachedCutoff).toBe(false)
  })

  it('drops issues missing created_at without setting reachedCutoff', () => {
    const { kept, reachedCutoff } = filterRecentIssues(
      [
        { id: 1, created_at: '2026-06-10T00:00:00Z' },
        { id: 2 }, // missing created_at
        { id: 3, created_at: '2026-06-05T00:00:00Z' },
      ],
      cutoff
    )
    expect(kept.map((i) => i.id)).toEqual([1, 3])
    expect(reachedCutoff).toBe(false)
  })
})

describe('fetchGithubIssues', () => {
  const now = new Date('2026-06-24T00:00:00.000Z')

  it('derives owner/repo, paginates, and concatenates recent issues', async () => {
    const recentIso = now.toISOString()
    const pages: Record<string, string> = {
      'page=1': JSON.stringify(
        Array.from({ length: 100 }, (_, i) => ({ id: i, created_at: recentIso }))
      ),
      'page=2': JSON.stringify([{ id: 100, created_at: recentIso }]),
    }
    const calls: string[] = []
    const httpGet = async (url: string) => {
      calls.push(url)
      const key = url.includes('page=2') ? 'page=2' : 'page=1'
      return { status: 200, body: pages[key] }
    }
    const result = await fetchGithubIssues('https://github.com/frontendbr/vagas', httpGet, now)
    expect(JSON.parse(result)).toHaveLength(101)
    expect(calls[0]).toContain('/repos/frontendbr/vagas/issues')
    expect(calls[0]).toContain('labels=Remoto')
    expect(calls[0]).toContain('sort=created')
    expect(calls).toHaveLength(2)
  })

  it('drops issues older than the recency window and stops paginating early', async () => {
    const calls: string[] = []
    const httpGet = async (url: string) => {
      calls.push(url)
      return {
        status: 200,
        body: JSON.stringify([
          { id: 1, created_at: now.toISOString() },
          { id: 2, created_at: '2000-01-01T00:00:00Z' },
        ]),
      }
    }
    const result = await fetchGithubIssues('https://github.com/frontendbr/vagas', httpGet, now)
    const arr = JSON.parse(result) as { id: number }[]
    expect(arr.map((i) => i.id)).toEqual([1])
    expect(calls).toHaveLength(1) // parou após a primeira página (bateu no corte)
  })

  it('throws when repoFromUrl cannot derive owner/repo from URL', async () => {
    const httpGet = async () => {
      throw new Error('should not be called')
    }
    await expect(fetchGithubIssues('https://github.com/onlyone', httpGet)).rejects.toThrow(
      /cannot derive owner\/repo/
    )
  })

  it('throws on HTTP error status', async () => {
    const httpGet = async () => ({ status: 403, body: 'rate limited' })
    await expect(fetchGithubIssues('https://github.com/backend-br/vagas', httpGet)).rejects.toThrow(
      /403/
    )
  })

  it('exposes a github adapter with fetch + parse for host github.com', () => {
    expect(github.host).toBe('github.com')
    expect(typeof github.fetch).toBe('function')
    expect(typeof github.parse).toBe('function')
  })
})
