import { describe, it, expect, vi } from 'vitest'
import { fetchActiveSources, upsertJobs, type JobRow } from './db.ts'

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
