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
    })),
})

const baseDeps = (over: Partial<PipelineDeps>): PipelineDeps => ({
  fetchActiveSources: async () => [{ url: 'https://a.com', label: 'A' }],
  resolveAdapter: () => adapter([{ title: 'Dev', url: 'https://a.com/1' }]),
  renderPage: async () => '<html></html>',
  scoreJob: () => ({ relevance_score: 2, relevance_level: 'medium' }),
  upsertJobs: async (jobs) => ({ count: jobs.length }),
  ...over,
})

describe('runScrape', () => {
  it('extracts, scores, and upserts rows with source_url', async () => {
    const upsertJobs = vi.fn(async (jobs) => ({ count: jobs.length }))
    const summary = await runScrape(baseDeps({ upsertJobs }))
    expect(summary).toEqual({ sources: 1, extracted: 1, inserted: 1, failedSources: 0 })
    expect(upsertJobs).toHaveBeenCalledWith([
      {
        title: 'Dev',
        company: 'C',
        url: 'https://a.com/1',
        location: null,
        description: null,
        source_url: 'https://a.com',
        relevance_score: 2,
        relevance_level: 'medium',
      },
    ])
  })

  it('isolates a failing source and still upserts the rest', async () => {
    const sources = [
      { url: 'https://bad.com', label: 'Bad' },
      { url: 'https://good.com', label: 'Good' },
    ]
    const renderPage = vi.fn(async (url: string) => {
      if (url === 'https://bad.com') throw new Error('render timeout')
      return '<html></html>'
    })
    const resolveAdapter = () => adapter([{ title: 'Dev', url: 'https://good.com/1' }])
    const upsertJobs = vi.fn(async (jobs) => ({ count: jobs.length }))
    const summary = await runScrape(
      baseDeps({ fetchActiveSources: async () => sources, renderPage, resolveAdapter, upsertJobs })
    )
    expect(summary).toEqual({ sources: 2, extracted: 1, inserted: 1, failedSources: 1 })
  })
})
