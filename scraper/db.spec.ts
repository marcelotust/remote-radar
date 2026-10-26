import { describe, it, expect, vi } from 'vitest'
import {
  fetchActiveSources,
  upsertJobs,
  recordSourceRun,
  type JobRow,
  type SourceRunResult,
} from './db.ts'

const sourcesClient = (rows: unknown) => ({
  from: () => ({
    select: () => ({
      eq: () => Promise.resolve({ data: rows, error: null }),
    }),
  }),
})

describe('fetchActiveSources', () => {
  it('returns active source rows', async () => {
    const client = sourcesClient([{ url: 'https://a.com', label: 'A' }])
    const rows = await fetchActiveSources(client as never)
    expect(rows).toEqual([{ url: 'https://a.com', label: 'A' }])
  })

  it('throws on a Supabase error', async () => {
    const client = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: null, error: new Error('boom') }) }),
      }),
    }
    await expect(fetchActiveSources(client as never)).rejects.toThrow('boom')
  })
})

describe('upsertJobs', () => {
  const job: JobRow = {
    title: 'T',
    company: 'C',
    url: 'u',
    location: null,
    description: null,
    source_url: 's',
    posted_at: '2026-10-20T00:00:00.000Z',
    relevance_score: 1,
    relevance_level: 'medium',
  }

  // select('url').in('url', [...]) resolves the already-stored urls; upsert resolves the write.
  const jobsClient = (stored: string[], upsertError: Error | null = null) => {
    const upsert = vi.fn<(rows: unknown[], opts: unknown) => Promise<{ error: Error | null }>>(() =>
      Promise.resolve({ error: upsertError })
    )
    const inFn = vi.fn(() => Promise.resolve({ data: stored.map((url) => ({ url })), error: null }))
    const client = { from: () => ({ select: () => ({ in: inFn }), upsert }) }
    return { client, upsert, inFn }
  }

  it('upserts on url, stamping last_seen_at, and counts only the new jobs', async () => {
    const { client, upsert } = jobsClient(['old'])
    const result = await upsertJobs(client as never, [job, { ...job, url: 'old' }])
    expect(result).toEqual({ count: 1 })
    expect(upsert).toHaveBeenCalledWith(
      [
        { ...job, last_seen_at: expect.any(String) },
        { ...job, url: 'old', last_seen_at: expect.any(String) },
      ],
      { onConflict: 'url' }
    )
  })

  it('writes one row per url when a batch repeats a listing', async () => {
    const { client, upsert } = jobsClient([])
    const result = await upsertJobs(client as never, [job, { ...job, title: 'T2' }])
    expect(result).toEqual({ count: 1 })
    expect(upsert.mock.calls[0][0]).toHaveLength(1)
  })

  it('looks up existing urls in bounded chunks', async () => {
    const { client, inFn } = jobsClient([])
    const many = Array.from({ length: 95 }, (_, i) => ({ ...job, url: `u${i}` }))
    await upsertJobs(client as never, many)
    expect(inFn).toHaveBeenCalledTimes(3)
  })

  it('throws when the write fails', async () => {
    const { client } = jobsClient([], new Error('boom'))
    await expect(upsertJobs(client as never, [job])).rejects.toThrow('boom')
  })

  it('skips every call and returns 0 for an empty list', async () => {
    const { client, upsert, inFn } = jobsClient([])
    expect(await upsertJobs(client as never, [])).toEqual({ count: 0 })
    expect(upsert).not.toHaveBeenCalled()
    expect(inFn).not.toHaveBeenCalled()
  })
})

describe('recordSourceRun', () => {
  it('updates the source row by url with the last-run fields', async () => {
    const eq = vi.fn(() => Promise.resolve({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const client = { from: () => ({ update }) }
    const result: SourceRunResult = {
      url: 'https://a.com',
      status: 'success',
      jobsAdded: 3,
      error: null,
    }
    await recordSourceRun(client as never, result)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_run_jobs_added: 3,
        last_run_status: 'success',
        last_run_error: null,
        last_run_at: expect.any(String),
      })
    )
    expect(eq).toHaveBeenCalledWith('url', 'https://a.com')
  })

  it('throws on a Supabase error', async () => {
    const client = {
      from: () => ({
        update: () => ({ eq: () => Promise.resolve({ error: new Error('boom') }) }),
      }),
    }
    const result: SourceRunResult = { url: 'u', status: 'error', jobsAdded: 0, error: 'x' }
    await expect(recordSourceRun(client as never, result)).rejects.toThrow('boom')
  })
})
