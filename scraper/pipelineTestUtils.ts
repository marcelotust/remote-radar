import type { PipelineDeps } from './pipeline.ts'
import type { Adapter, RawJob } from './adapters/types.ts'

// Shared fixtures for the pipeline specs.
export const datedAdapter = (jobs: RawJob[]): Adapter => ({
  host: 'x',
  readySelector: 'body',
  parse: () => jobs,
})

export const job = (over: Partial<RawJob>): RawJob => ({
  title: 'Dev',
  company: 'C',
  url: 'https://a.com/1',
  location: null,
  description: null,
  published_at: null,
  ...over,
})

export const adapter = (jobs: { title: string; url: string }[]): Adapter => ({
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

export const baseDeps = (over: Partial<PipelineDeps>): PipelineDeps => ({
  fetchActiveSources: async () => [{ url: 'https://a.com', label: 'A' }],
  resolveAdapter: () => adapter([{ title: 'Dev', url: 'https://a.com/1' }]),
  renderPage: async () => '<html></html>',
  scoreJob: () => ({ relevance_score: 2, relevance_level: 'medium' }),
  upsertJobs: async (jobs) => ({ count: jobs.length }),
  recordSourceRun: async () => {},
  httpGet: async () => ({ status: 200, body: '[]' }),
  ...over,
})
