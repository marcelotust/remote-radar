// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseGreenhouse, fetchGreenhouse, greenhouse } from './greenhouse.ts'

const board = (jobs: unknown[]) => JSON.stringify({ jobs })

describe('parseGreenhouse', () => {
  it('maps a remote job and unescapes HTML entities in description', () => {
    const jobs = parseGreenhouse(
      board([
        {
          title: 'Staff Engineer',
          company_name: 'Acme',
          absolute_url: 'https://boards.greenhouse.io/acme/jobs/1',
          location: { name: 'Remote - Brazil' },
          first_published: '2026-06-02T08:58:57-04:00',
          updated_at: '2026-06-19T12:11:02-04:00',
          content: '&lt;p&gt;Hello &amp; welcome&lt;/p&gt;',
        },
      ])
    )
    expect(jobs).toEqual([
      {
        title: 'Staff Engineer',
        company: 'Acme',
        url: 'https://boards.greenhouse.io/acme/jobs/1',
        location: 'Remote - Brazil',
        description: '<p>Hello & welcome</p>',
        published_at: '2026-06-02T12:58:57.000Z',
      },
    ])
  })

  it('falls back to updated_at when first_published is absent', () => {
    const jobs = parseGreenhouse(
      board([
        {
          title: 'Remote Dev',
          company_name: 'Acme',
          absolute_url: 'https://boards.greenhouse.io/acme/jobs/2',
          location: { name: 'Remote' },
          updated_at: '2026-06-19T12:11:02-04:00',
        },
      ])
    )
    expect(jobs[0].published_at).toBe('2026-06-19T16:11:02.000Z')
    expect(jobs[0].description).toBeNull()
  })

  it('drops non-remote jobs by location name', () => {
    const jobs = parseGreenhouse(
      board([
        {
          title: 'On-site Role',
          company_name: 'Acme',
          absolute_url: 'https://boards.greenhouse.io/acme/jobs/3',
          location: { name: 'San Francisco, CA' },
          first_published: '2026-06-02T08:58:57-04:00',
        },
      ])
    )
    expect(jobs).toEqual([])
  })

  it('skips jobs missing title, company_name, or absolute_url', () => {
    const jobs = parseGreenhouse(
      board([
        { company_name: 'Acme', absolute_url: 'https://x/1', location: { name: 'Remote' } },
        { title: 'No company', absolute_url: 'https://x/2', location: { name: 'Remote' } },
        { title: 'No url', company_name: 'Acme', location: { name: 'Remote' } },
      ])
    )
    expect(jobs).toEqual([])
  })

  it('truncates description to 5000 chars', () => {
    const long = 'a'.repeat(6000)
    const jobs = parseGreenhouse(
      board([
        {
          title: 'Remote Dev',
          company_name: 'Acme',
          absolute_url: 'https://boards.greenhouse.io/acme/jobs/4',
          location: { name: 'Remote' },
          content: long,
        },
      ])
    )
    expect(jobs[0].description).toHaveLength(5000)
  })

  it('returns [] for malformed JSON or missing jobs array', () => {
    expect(parseGreenhouse('not json')).toEqual([])
    expect(parseGreenhouse('{}')).toEqual([])
    expect(parseGreenhouse(JSON.stringify({ jobs: 'nope' }))).toEqual([])
  })
})

describe('fetchGreenhouse', () => {
  it('derives the API URL from the slug and returns the raw body', async () => {
    const calls: string[] = []
    const body = board([])
    const httpGet = async (url: string) => {
      calls.push(url)
      return { status: 200, body }
    }
    const result = await fetchGreenhouse('https://boards.greenhouse.io/acme', httpGet)
    expect(calls[0]).toBe('https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true')
    expect(result).toBe(body)
  })

  it('throws when no slug can be derived from the URL', async () => {
    const httpGet = async () => {
      throw new Error('should not be called')
    }
    await expect(fetchGreenhouse('https://boards.greenhouse.io', httpGet)).rejects.toThrow(/slug/)
  })

  it('throws on HTTP error status', async () => {
    const httpGet = async () => ({ status: 404, body: 'not found' })
    await expect(fetchGreenhouse('https://boards.greenhouse.io/acme', httpGet)).rejects.toThrow(
      /404/
    )
  })
})

describe('greenhouse adapter', () => {
  it('exposes fetch + parse for host boards.greenhouse.io', () => {
    expect(greenhouse.host).toBe('boards.greenhouse.io')
    expect(typeof greenhouse.fetch).toBe('function')
    expect(typeof greenhouse.parse).toBe('function')
  })
})
