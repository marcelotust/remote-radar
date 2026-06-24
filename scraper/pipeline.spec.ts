import { describe, it, expect, vi } from 'vitest'
import { runScrape, type PipelineDeps } from './pipeline.ts'
import type { Adapter } from './adapters/types.ts'

const adapter = (jobs: { title: string; url: string }[]): Adapter => ({
  host: 'x',
  readySelector: 'body',
  parse: () =>
    jobs.map((j) => ({
      title: j.title,
      company: 'C',
      url: j.url,
      location: null,
      description: null,
      published_at: null,
    })),
})

const baseDeps = (over: Partial<PipelineDeps>): PipelineDeps => ({
  fetchActiveSources: async () => [{ url: 'https://a.com', label: 'A' }],
  resolveAdapter: () => adapter([{ title: 'Dev', url: 'https://a.com/1' }]),
  renderPage: async () => '<html></html>',
  scoreJob: () => ({ relevance_score: 2, relevance_level: 'medium' }),
  upsertJobs: async (jobs) => ({ count: jobs.length }),
  recordSourceRun: async () => {},
  httpGet: async () => ({ status: 200, body: '[]' }),
  ...over,
})

describe('runScrape', () => {
  it('extracts, scores, and upserts rows with source_url + per-source result', async () => {
    const upsertJobs = vi.fn(async (jobs) => ({ count: jobs.length }))
    const summary = await runScrape(baseDeps({ upsertJobs }))
    expect(summary).toEqual({
      sources: 1,
      extracted: 1,
      inserted: 1,
      failedSources: 0,
      perSource: [{ url: 'https://a.com', status: 'success', jobsAdded: 1, error: null }],
    })
    expect(upsertJobs).toHaveBeenCalledWith([
      {
        title: 'Dev',
        company: 'C',
        url: 'https://a.com/1',
        location: null,
        description: null,
        published_at: null,
        source_url: 'https://a.com',
        relevance_score: 2,
        relevance_level: 'medium',
      },
    ])
  })

  it('records a success result with jobsAdded 0 when a source yields no jobs', async () => {
    const recordSourceRun = vi.fn(async () => {})
    const summary = await runScrape(
      baseDeps({ resolveAdapter: () => adapter([]), recordSourceRun })
    )
    expect(summary.perSource).toEqual([
      { url: 'https://a.com', status: 'success', jobsAdded: 0, error: null },
    ])
    expect(recordSourceRun).toHaveBeenCalledWith({
      url: 'https://a.com',
      status: 'success',
      jobsAdded: 0,
      error: null,
    })
  })

  it('isolates a failing source, records an error result, and still upserts the rest', async () => {
    const sources = [
      { url: 'https://bad.com', label: 'Bad' },
      { url: 'https://good.com', label: 'Good' },
    ]
    const renderPage = vi.fn(async (url: string) => {
      if (url === 'https://bad.com') throw new Error('render timeout')
      return '<html></html>'
    })
    const resolveAdapter = () => adapter([{ title: 'Dev', url: 'https://good.com/1' }])
    const recordSourceRun = vi.fn(async () => {})
    const summary = await runScrape(
      baseDeps({
        fetchActiveSources: async () => sources,
        renderPage,
        resolveAdapter,
        recordSourceRun,
      })
    )
    expect(summary.sources).toBe(2)
    expect(summary.inserted).toBe(1)
    expect(summary.failedSources).toBe(1)
    expect(summary.perSource[0]).toEqual({
      url: 'https://bad.com',
      status: 'error',
      jobsAdded: 0,
      error: 'render timeout',
    })
    expect(summary.perSource[1]).toEqual({
      url: 'https://good.com',
      status: 'success',
      jobsAdded: 1,
      error: null,
    })
    expect(recordSourceRun).toHaveBeenCalledTimes(2)
  })

  it('does not abort the run when recordSourceRun itself throws', async () => {
    const recordSourceRun = vi.fn(async () => {
      throw new Error('metadata write failed')
    })
    const summary = await runScrape(baseDeps({ recordSourceRun }))
    expect(summary.inserted).toBe(1)
    expect(summary.perSource).toHaveLength(1)
  })

  it('uses adapter.fetch (not renderPage) when the adapter defines fetch', async () => {
    const renderPage = vi.fn(async () => '<html></html>')
    const body = JSON.stringify([{ id: 1 }])
    const httpGet = vi.fn(async () => ({
      status: 200,
      body,
    }))
    const parse = vi.fn(() => [
      {
        title: 'Dev',
        company: 'C',
        url: 'https://x/1',
        location: 'Remoto',
        description: null,
        published_at: null,
      },
    ])
    const fetchAdapter: Adapter = {
      host: 'api',
      fetch: async (_url, ctx) => (await ctx.httpGet('https://api.example/x')).body,
      parse,
    }
    const summary = await runScrape(
      baseDeps({ resolveAdapter: () => fetchAdapter, renderPage, httpGet })
    )
    expect(httpGet).toHaveBeenCalledTimes(1)
    expect(renderPage).not.toHaveBeenCalled()
    expect(parse).toHaveBeenCalledWith(body)
    expect(summary.inserted).toBe(1)
  })

  it('records an error for an adapter with neither fetch nor readySelector', async () => {
    const badAdapter: Adapter = {
      host: 'x',
      parse: () => [],
    }
    const summary = await runScrape(baseDeps({ resolveAdapter: () => badAdapter }))
    expect(summary.failedSources).toBe(1)
    expect(summary.perSource[0].status).toBe('error')
    expect(summary.perSource[0].error).toMatch(/neither fetch nor readySelector/)
  })
})
