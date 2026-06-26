// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseLever, fetchLever, lever } from './lever.ts'

const wrapper = (postings: unknown[]) => JSON.stringify({ company: 'acme', postings })

describe('parseLever', () => {
  it('maps a remote posting (workplaceType) to RawJob', () => {
    const jobs = parseLever(
      wrapper([
        {
          text: 'Senior Backend Engineer',
          categories: { location: 'Remote - Worldwide', allLocations: ['Remote - Worldwide'] },
          workplaceType: 'remote',
          createdAt: 1717200000000,
          hostedUrl: 'https://jobs.lever.co/acme/abc-123',
          descriptionPlain: 'Build things.',
        },
      ])
    )
    expect(jobs).toEqual([
      {
        title: 'Senior Backend Engineer',
        company: 'acme',
        url: 'https://jobs.lever.co/acme/abc-123',
        location: 'Remote - Worldwide',
        description: 'Build things.',
        published_at: '2024-06-01T00:00:00.000Z',
      },
    ])
  })

  it('keeps a posting when allLocations matches /remote/i even if workplaceType is unset', () => {
    const jobs = parseLever(
      wrapper([
        {
          text: 'Designer',
          categories: { location: 'Anywhere', allLocations: ['São Paulo', 'Remote'] },
          createdAt: 1717200000000,
          hostedUrl: 'https://jobs.lever.co/acme/d-1',
        },
      ])
    )
    expect(jobs).toHaveLength(1)
    expect(jobs[0].title).toBe('Designer')
    expect(jobs[0].description).toBeNull()
  })

  it('drops non-remote postings (hybrid / on-site, no remote location)', () => {
    const jobs = parseLever(
      wrapper([
        {
          text: 'Office Manager',
          categories: { location: 'Arlington, TX', allLocations: ['Arlington, TX'] },
          workplaceType: 'on-site',
          createdAt: 1717200000000,
          hostedUrl: 'https://jobs.lever.co/acme/o-1',
        },
        {
          text: 'Hybrid Role',
          categories: { location: 'Berlin', allLocations: ['Berlin'] },
          workplaceType: 'hybrid',
          createdAt: 1717200000000,
          hostedUrl: 'https://jobs.lever.co/acme/h-1',
        },
      ])
    )
    expect(jobs).toEqual([])
  })

  it('skips postings missing title or hostedUrl', () => {
    const jobs = parseLever(
      wrapper([
        { workplaceType: 'remote', createdAt: 1717200000000, hostedUrl: 'https://x/1' },
        { text: 'No URL', workplaceType: 'remote', createdAt: 1717200000000 },
      ])
    )
    expect(jobs).toEqual([])
  })

  it('sets published_at to null when createdAt is absent', () => {
    const jobs = parseLever(
      wrapper([
        {
          text: 'Remote Eng',
          categories: { location: 'Remote' },
          workplaceType: 'remote',
          hostedUrl: 'https://jobs.lever.co/acme/n-1',
        },
      ])
    )
    expect(jobs[0].published_at).toBeNull()
  })

  it('returns [] for malformed JSON or non-array postings', () => {
    expect(parseLever('not json')).toEqual([])
    expect(parseLever(JSON.stringify({ company: 'acme', postings: 'nope' }))).toEqual([])
    expect(parseLever('{}')).toEqual([])
  })
})

describe('fetchLever', () => {
  it('derives the API URL from the slug and wraps the response with the company', async () => {
    const calls: string[] = []
    const httpGet = async (url: string) => {
      calls.push(url)
      return { status: 200, body: JSON.stringify([{ text: 'x' }]) }
    }
    const result = await fetchLever('https://jobs.lever.co/acme', httpGet)
    expect(calls[0]).toBe('https://api.lever.co/v0/postings/acme?mode=json')
    expect(JSON.parse(result)).toEqual({ company: 'acme', postings: [{ text: 'x' }] })
  })

  it('throws when no slug can be derived from the URL', async () => {
    const httpGet = async () => {
      throw new Error('should not be called')
    }
    await expect(fetchLever('https://jobs.lever.co', httpGet)).rejects.toThrow(/slug/)
  })

  it('throws on HTTP error status', async () => {
    const httpGet = async () => ({ status: 404, body: 'not found' })
    await expect(fetchLever('https://jobs.lever.co/acme', httpGet)).rejects.toThrow(/404/)
  })
})

describe('lever adapter', () => {
  it('exposes fetch + parse for host jobs.lever.co', () => {
    expect(lever.host).toBe('jobs.lever.co')
    expect(typeof lever.fetch).toBe('function')
    expect(typeof lever.parse).toBe('function')
  })
})
