import type { Adapter, RawJob } from './adapters/types.ts'
import type { JobRow, SourceRow } from './db.ts'
import type { RelevanceLevel } from '../src/types/index.ts'

export interface PipelineDeps {
  fetchActiveSources: () => Promise<SourceRow[]>
  resolveAdapter: (url: string) => Adapter
  renderPage: (url: string, readySelector: string) => Promise<string>
  scoreJob: (raw: RawJob) => { relevance_score: number; relevance_level: RelevanceLevel }
  upsertJobs: (jobs: JobRow[]) => Promise<{ count: number }>
}

export interface ScrapeSummary {
  sources: number
  extracted: number
  inserted: number
  failedSources: number
}

export const runScrape = async (deps: PipelineDeps): Promise<ScrapeSummary> => {
  const sources = await deps.fetchActiveSources()
  const rows: JobRow[] = []
  let failedSources = 0

  for (const source of sources) {
    try {
      const adapter = deps.resolveAdapter(source.url)
      const html = await deps.renderPage(source.url, adapter.readySelector)
      for (const raw of adapter.parse(html)) {
        const { relevance_score, relevance_level } = deps.scoreJob(raw)
        rows.push({ ...raw, source_url: source.url, relevance_score, relevance_level })
      }
    } catch (err) {
      failedSources += 1
      console.warn(`[scrape] source failed: ${source.url} — ${(err as Error).message}`)
    }
  }

  const { count } = await deps.upsertJobs(rows)
  return { sources: sources.length, extracted: rows.length, inserted: count, failedSources }
}
