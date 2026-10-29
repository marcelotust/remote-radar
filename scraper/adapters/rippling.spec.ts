// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { parseRippling, fetchRippling, rippling } from './rippling.ts'

const wrap = (jobs: unknown[], company: string | undefined = 'acme') =>
  JSON.stringify({ company, jobs })

describe('parseRippling', () => {
  it('keeps remote jobs and drops on-site ones', () => {
    expect(
      parseRippling(
        wrap([
          {
            name: 'Engineer',
            url: 'https://ats.rippling.com/acme/jobs/1',
            workLocation: { label: 'Remote (United States)' },
          },
          {
            name: 'Chef',
            url: 'https://ats.rippling.com/acme/jobs/2',
            workLocation: { label: 'Chicago, IL' },
          },
          { name: 'Nowhere', url: 'https://ats.rippling.com/acme/jobs/3' },
        ])
      )
    ).toEqual([
      {
        title: 'Engineer',
        company: 'acme',
        url: 'https://ats.rippling.com/acme/jobs/1',
        location: 'Remote (United States)',
        description: null,
        published_at: null,
      },
    ])
  })

  it('returns [] for invalid JSON, a missing array or a missing company', () => {
    expect(parseRippling('x')).toEqual([])
    expect(parseRippling('{}')).toEqual([])
    expect(
      parseRippling(wrap([{ name: 'A', url: 'u', workLocation: { label: 'Remote' } }], ''))
    ).toEqual([])
  })

  it('skips remote jobs without a title or url', () => {
    expect(parseRippling(wrap([{ url: 'u', workLocation: { label: 'Remote' } }]))).toEqual([])
  })
})

describe('fetchRippling', () => {
  it('calls the board API and wraps the array', async () => {
    const httpGet = vi.fn().mockResolvedValue({ status: 200, body: '[{"name":"A"}]' })
    const out = await fetchRippling('https://ats.rippling.com/acme/jobs', httpGet)
    expect(httpGet).toHaveBeenCalledWith(
      'https://api.rippling.com/platform/api/ats/v1/board/acme/jobs'
    )
    expect(JSON.parse(out)).toEqual({ company: 'acme', jobs: [{ name: 'A' }] })
  })

  it('throws on HTTP errors and a missing slug', async () => {
    const httpGet = vi.fn().mockResolvedValue({ status: 404, body: '' })
    await expect(fetchRippling('https://ats.rippling.com/acme', httpGet)).rejects.toThrow(
      'Rippling API 404 for acme'
    )
    await expect(fetchRippling('https://ats.rippling.com/', httpGet)).rejects.toThrow(
      'cannot derive Rippling board slug'
    )
  })

  it('is bound to ats.rippling.com', () => {
    expect(rippling.host).toBe('ats.rippling.com')
  })
})
