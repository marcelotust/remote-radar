import type { Adapter, RawJob } from './adapters/types.ts'
import type { JobRow, SourceRow, SourceRunResult } from './db.ts'
import type { RelevanceLevel } from '../src/types/index.ts'

export interface PipelineDeps {
  fetchActiveSources: () => Promise<SourceRow[]>
  resolveAdapter: (url: string) => Adapter
  renderPage: (url: string, readySelector: string) => Promise<string>
  scoreJob: (raw: RawJob) => { relevance_score: number; relevance_level: RelevanceLevel }
  upsertJobs: (jobs: JobRow[]) => Promise<{ count: number }>
  recordSourceRun: (result: SourceRunResult) => Promise<void>
}

export interface ScrapeSummary {
  sources: number
  extracted: number
  inserted: number
  failedSources: number
  perSource: SourceRunResult[]
}

const truncate = (s: string, max: number): string => (s.length > max ? s.slice(0, max) : s)

export const runScrape = async (deps: PipelineDeps): Promise<ScrapeSummary> => {
  const sources = await deps.fetchActiveSources()
  const perSource: SourceRunResult[] = []
  let extracted = 0
  let inserted = 0
  let failedSources = 0

  for (const source of sources) {
    let result: SourceRunResult
    try {
      const adapter = deps.resolveAdapter(source.url)
      const html = await deps.renderPage(source.url, adapter.readySelector)
      const rows: JobRow[] = adapter.parse(html).map((raw) => {
        const { relevance_score, relevance_level } = deps.scoreJob(raw)
        return { ...raw, source_url: source.url, relevance_score, relevance_level }
      })
      extracted += rows.length
      const { count } = await deps.upsertJobs(rows)
      inserted += count
      result = { url: source.url, status: 'success', jobsAdded: count, error: null }
    } catch (err) {
      failedSources += 1
      result = {
        url: source.url,
        status: 'error',
        jobsAdded: 0,
        error: truncate((err as Error).message, 300),
      }
      console.warn(`[scrape] source failed: ${source.url} — ${result.error}`)
    }

    try {
      await deps.recordSourceRun(result)
    } catch (err) {
      console.warn(`[scrape] could not record run for ${source.url} — ${(err as Error).message}`)
    }
    perSource.push(result)
  }

  return { sources: sources.length, extracted, inserted, failedSources, perSource }
}
