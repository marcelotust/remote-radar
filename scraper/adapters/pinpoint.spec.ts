// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { parsePinpoint, fetchPinpoint, pinpoint } from './pinpoint.ts'

const wrap = (data: unknown[], company: string | undefined = 'acme') =>
  JSON.stringify({ company, data })

describe('parsePinpoint', () => {
  it('maps a remote posting to RawJob', () => {
    expect(
      parsePinpoint(
        wrap([
          {
            title: 'Engineer',
            url: 'https://acme.pinpointhq.com/en/postings/1',
            workplace_type: 'remote',
            description: '<p>Build.</p>',
            location: { name: 'Remote' },
          },
        ])
      )
    ).toEqual([
      {
        title: 'Engineer',
        company: 'acme',
        url: 'https://acme.pinpointhq.com/en/postings/1',
        location: 'Remote',
        description: 'Build.',
        published_at: null,
      },
    ])
  })

  it('drops non-remote postings and ones missing title or url', () => {
    expect(
      parsePinpoint(
        wrap([
          { title: 'A', url: 'u', workplace_type: 'onsite' },
          { title: '', url: 'u', workplace_type: 'remote' },
          { title: 'B', workplace_type: 'remote' },
        ])
      )
    ).toEqual([])
  })

  it('returns [] for invalid JSON, a missing array or a missing company', () => {
    expect(parsePinpoint('x')).toEqual([])
    expect(parsePinpoint('{}')).toEqual([])
    expect(parsePinpoint(wrap([{ title: 'A', url: 'u', workplace_type: 'remote' }], ''))).toEqual(
      []
    )
  })
})

describe('fetchPinpoint', () => {
  it('requests postings.json on the account subdomain and wraps the result', async () => {
    const httpGet = vi.fn().mockResolvedValue({ status: 200, body: '{"data":[{"title":"A"}]}' })
    const out = await fetchPinpoint('https://acme.pinpointhq.com', httpGet)
    expect(httpGet).toHaveBeenCalledWith('https://acme.pinpointhq.com/postings.json', {
      Accept: 'application/json',
    })
    expect(JSON.parse(out)).toEqual({ company: 'acme', data: [{ title: 'A' }] })
  })

  it('throws on HTTP errors and a missing subdomain', async () => {
    const httpGet = vi.fn().mockResolvedValue({ status: 404, body: '' })
    await expect(fetchPinpoint('https://acme.pinpointhq.com', httpGet)).rejects.toThrow(
      'Pinpoint API 404 for acme'
    )
    await expect(fetchPinpoint('https://pinpointhq.com', httpGet)).rejects.toThrow(
      'cannot derive Pinpoint subdomain'
    )
  })

  it('is bound to pinpointhq.com', () => {
    expect(pinpoint.host).toBe('pinpointhq.com')
  })
})
