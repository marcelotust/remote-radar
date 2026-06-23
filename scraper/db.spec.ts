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
    relevance_score: 1,
    relevance_level: 'medium',
  }

  it('upserts with onConflict url + ignoreDuplicates and returns the inserted count', async () => {
    const upsert = vi.fn(() => ({
      select: () => Promise.resolve({ data: [{ url: 'u' }], error: null }),
    }))
    const client = { from: () => ({ upsert }) }
    const result = await upsertJobs(client as never, [job])
    expect(result).toEqual({ count: 1 })
    expect(upsert).toHaveBeenCalledWith([job], { onConflict: 'url', ignoreDuplicates: true })
  })

  it('skips the call and returns 0 for an empty list', async () => {
    const upsert = vi.fn()
    const client = { from: () => ({ upsert }) }
    expect(await upsertJobs(client as never, [])).toEqual({ count: 0 })
    expect(upsert).not.toHaveBeenCalled()
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
