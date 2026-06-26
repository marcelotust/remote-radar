import type { Adapter, RawJob, FetchContext } from './adapters/types.ts'
import type { JobRow, SourceRow, SourceRunResult } from './db.ts'
import type { RelevanceLevel } from '../src/types/index.ts'
import { recencyCutoffIso, isRecent } from './recency.ts'

export interface PipelineDeps {
  fetchActiveSources: () => Promise<SourceRow[]>
  resolveAdapter: (url: string) => Adapter
  renderPage: (url: string, readySelector: string) => Promise<string>
  httpGet: FetchContext['httpGet']
  scoreJob: (raw: RawJob) => { relevance_score: number; relevance_level: RelevanceLevel }
  upsertJobs: (jobs: JobRow[]) => Promise<{ count: number }>
  recordSourceRun: (result: SourceRunResult) => Promise<void>
  /** Max sources rendered/fetched in parallel. Defaults to 5. */
  concurrency?: number
}

const DEFAULT_CONCURRENCY = 5

export interface ScrapeSummary {
  sources: number
  extracted: number
  inserted: number
  failedSources: number
  perSource: SourceRunResult[]
}

interface SourceResult {
  result: SourceRunResult
  extracted: number
}

const truncate = (s: string, max: number): string => (s.length > max ? s.slice(0, max) : s)

export const runScrape = async (deps: PipelineDeps): Promise<ScrapeSummary> => {
  const sources = await deps.fetchActiveSources()
  const cutoff = recencyCutoffIso()

  const processSource = async (source: SourceRow): Promise<SourceResult> => {
    let result: SourceRunResult
    let extracted = 0
    try {
      const adapter = deps.resolveAdapter(source.url)
      let content: string
      if (adapter.fetch) {
        content = await adapter.fetch(source.url, { httpGet: deps.httpGet })
      } else if (adapter.readySelector) {
        content = await deps.renderPage(source.url, adapter.readySelector)
      } else {
        throw new Error(`adapter for ${source.url} defines neither fetch nor readySelector`)
      }
      const rows: JobRow[] = adapter
        .parse(content)
        .filter((raw) => isRecent(raw.published_at, cutoff))
        .map((raw) => {
          const { relevance_score, relevance_level } = deps.scoreJob(raw)
          return {
            title: raw.title,
            company: raw.company,
            url: raw.url,
            location: raw.location,
            description: raw.description,
            source_url: source.url,
            relevance_score,
            relevance_level,
          }
        })
      extracted = rows.length
      const { count } = await deps.upsertJobs(rows)
      result = { url: source.url, status: 'success', jobsAdded: count, error: null }
    } catch (err) {
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
    return { result, extracted }
  }

  // Bounded worker pool: workers pull the next index off a shared counter, so at
  // most `concurrency` sources are in flight. Results are written at the source's
  // index, keeping `perSource` in input order regardless of finish order.
  const results = new Array<SourceResult>(sources.length)
  const concurrency = Math.max(1, deps.concurrency ?? DEFAULT_CONCURRENCY)
  let next = 0
  const worker = async (): Promise<void> => {
    while (true) {
      const i = next++
      if (i >= sources.length) return
      results[i] = await processSource(sources[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, sources.length) }, worker))

  const perSource = results.map((r) => r.result)
  const extracted = results.reduce((sum, r) => sum + r.extracted, 0)
  const inserted = results.reduce((sum, r) => sum + r.result.jobsAdded, 0)
  const failedSources = results.filter((r) => r.result.status === 'error').length

  return { sources: sources.length, extracted, inserted, failedSources, perSource }
}
