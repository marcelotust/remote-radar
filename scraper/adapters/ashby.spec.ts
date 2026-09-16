// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseAshby, fetchAshby, ashby } from './ashby.ts'

const board = (jobs: unknown[], organizationName = 'acme') =>
  JSON.stringify({ organizationName, jobs })

describe('parseAshby', () => {
  it('maps a remote job (workplaceType Remote) to RawJob', () => {
    const jobs = parseAshby(
      board([
        {
          title: 'Senior Backend Engineer',
          jobUrl: 'https://jobs.ashbyhq.com/acme/abc-123',
          location: 'Americas',
          workplaceType: 'Remote',
          publishedAt: '2026-08-24T14:08:55.972Z',
          descriptionHtml: '<p>Build things.</p>',
        },
      ])
    )
    expect(jobs).toEqual([
      {
        title: 'Senior Backend Engineer',
        company: 'acme',
        url: 'https://jobs.ashbyhq.com/acme/abc-123',
        location: 'Americas',
        description: 'Build things.',
        published_at: '2026-08-24T14:08:55.972Z',
      },
    ])
  })

  it('drops jobs whose workplaceType is Hybrid or Onsite, even when isRemote is true', () => {
    const jobs = parseAshby(
      board([
        {
          title: 'Hybrid Role',
          jobUrl: 'https://jobs.ashbyhq.com/acme/h-1',
          location: 'San Francisco, CA',
          workplaceType: 'Hybrid',
        },
        {
          title: 'Onsite Role',
          jobUrl: 'https://jobs.ashbyhq.com/acme/o-1',
          location: 'New York, NY',
          workplaceType: 'Onsite',
        },
      ])
    )
    expect(jobs).toEqual([])
  })

  it('skips jobs missing title or jobUrl', () => {
    const jobs = parseAshby(
      board([
        { workplaceType: 'Remote', jobUrl: 'https://x/1' },
        { title: 'No URL', workplaceType: 'Remote' },
      ])
    )
    expect(jobs).toEqual([])
  })

  it('strips HTML tags from the description and truncates to 5000 chars', () => {
    const longHtml = `<p>${'a'.repeat(6000)}</p>`
    const jobs = parseAshby(
      board([
        {
          title: 'Eng',
          jobUrl: 'https://jobs.ashbyhq.com/acme/d-1',
          workplaceType: 'Remote',
          descriptionHtml: longHtml,
        },
      ])
    )
    expect(jobs[0].description).toHaveLength(5000)
  })

  it('sets published_at to null when publishedAt is absent', () => {
    const jobs = parseAshby(
      board([
        {
          title: 'Remote Eng',
          jobUrl: 'https://jobs.ashbyhq.com/acme/n-1',
          workplaceType: 'remote',
        },
      ])
    )
    expect(jobs[0].published_at).toBeNull()
  })

  it('returns [] for malformed JSON or non-array jobs', () => {
    expect(parseAshby('not json')).toEqual([])
    expect(parseAshby(JSON.stringify({ organizationName: 'acme', jobs: 'nope' }))).toEqual([])
    expect(parseAshby('{}')).toEqual([])
  })
})

describe('fetchAshby', () => {
  it('derives the API URL from the slug and wraps the response with the org slug', async () => {
    const calls: string[] = []
    const httpGet = async (url: string) => {
      calls.push(url)
      return { status: 200, body: JSON.stringify({ jobs: [{ title: 'x' }], apiVersion: '1' }) }
    }
    const result = await fetchAshby('https://jobs.ashbyhq.com/acme', httpGet)
    expect(calls[0]).toBe('https://api.ashbyhq.com/posting-api/job-board/acme')
    expect(JSON.parse(result)).toEqual({ organizationName: 'acme', jobs: [{ title: 'x' }] })
  })

  it('throws when no slug can be derived from the URL', async () => {
    const httpGet = async () => {
      throw new Error('should not be called')
    }
    await expect(fetchAshby('https://jobs.ashbyhq.com', httpGet)).rejects.toThrow(/slug/)
  })

  it('throws on HTTP error status', async () => {
    const httpGet = async () => ({ status: 404, body: 'not found' })
    await expect(fetchAshby('https://jobs.ashbyhq.com/acme', httpGet)).rejects.toThrow(/404/)
  })
})

describe('ashby adapter', () => {
  it('exposes fetch + parse for host jobs.ashbyhq.com', () => {
    expect(ashby.host).toBe('jobs.ashbyhq.com')
    expect(typeof ashby.fetch).toBe('function')
    expect(typeof ashby.parse).toBe('function')
  })
})
