// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { parseWorkable, fetchWorkable, workable } from './workable.ts'

const board = (jobs: unknown[], name: string | undefined = 'Acme') => JSON.stringify({ name, jobs })

describe('parseWorkable', () => {
  it('maps a telecommuting job to RawJob', () => {
    const jobs = parseWorkable(
      board([
        {
          title: 'Senior Engineer',
          url: 'https://apply.workable.com/j/ABC123',
          telecommuting: true,
          published_on: '2026-09-09',
          city: 'Berlin',
          country: 'Germany',
          description: '<p>Build things.</p>',
        },
      ])
    )
    expect(jobs).toEqual([
      {
        title: 'Senior Engineer',
        company: 'Acme',
        url: 'https://apply.workable.com/j/ABC123',
        location: 'Berlin, Germany',
        description: 'Build things.',
        published_at: '2026-09-09T00:00:00.000Z',
      },
    ])
  })

  it('drops on-site jobs and jobs missing title or url', () => {
    const jobs = parseWorkable(
      board([
        { title: 'Onsite', url: 'https://apply.workable.com/j/1', telecommuting: false },
        { title: '', url: 'https://apply.workable.com/j/2', telecommuting: true },
        { title: 'No url', telecommuting: true },
      ])
    )
    expect(jobs).toEqual([])
  })

  it('falls back to created_at and null location/description', () => {
    const [job] = parseWorkable(
      board([
        {
          title: 'Dev',
          url: 'https://apply.workable.com/j/3',
          telecommuting: true,
          created_at: '2026-09-08',
        },
      ])
    )
    expect(job.published_at).toBe('2026-09-08T00:00:00.000Z')
    expect(job.location).toBeNull()
    expect(job.description).toBeNull()
  })

  it('returns [] for invalid JSON, a missing jobs array or a missing company name', () => {
    expect(parseWorkable('not json')).toEqual([])
    expect(parseWorkable('{}')).toEqual([])
    expect(parseWorkable(board([{ title: 'x', url: 'y', telecommuting: true }], ''))).toEqual([])
  })
})

describe('fetchWorkable', () => {
  it('calls the widget API with the account slug', async () => {
    const httpGet = vi.fn().mockResolvedValue({ status: 200, body: '{"jobs":[]}' })
    await expect(fetchWorkable('https://apply.workable.com/seeq/', httpGet)).resolves.toBe(
      '{"jobs":[]}'
    )
    expect(httpGet).toHaveBeenCalledWith(
      'https://apply.workable.com/api/v1/widget/accounts/seeq?details=true'
    )
  })

  it('throws on an HTTP error', async () => {
    const httpGet = vi.fn().mockResolvedValue({ status: 404, body: '' })
    await expect(fetchWorkable('https://apply.workable.com/nope', httpGet)).rejects.toThrow(
      'Workable API 404 for nope'
    )
  })

  it('throws when the URL has no slug', async () => {
    await expect(fetchWorkable('https://apply.workable.com/', vi.fn())).rejects.toThrow(
      'cannot derive Workable account slug'
    )
  })
})

describe('workable adapter', () => {
  it('is bound to apply.workable.com', () => {
    expect(workable.host).toBe('apply.workable.com')
  })
})
