import 'dotenv/config'
import { appendFileSync } from 'node:fs'
import { launchBrowser, renderPage } from './render.ts'
import { resolveAdapter } from './adapters/index.ts'
import { scoreJob } from './score.ts'
import { createScraperClient, fetchActiveSources, upsertJobs, recordSourceRun } from './db.ts'
import { runScrape } from './pipeline.ts'
import { buildRunSummaryMarkdown } from './runSummary.ts'

const numericEnv = (name: string, fallback: number): number => {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const main = async (): Promise<void> => {
  const client = createScraperClient()
  const browser = await launchBrowser()
  const renderTimeoutMs = numericEnv('SCRAPER_RENDER_TIMEOUT_MS', 10000)
  const concurrency = numericEnv('SCRAPER_CONCURRENCY', 5)
  try {
    const summary = await runScrape({
      concurrency,
      fetchActiveSources: () => fetchActiveSources(client),
      resolveAdapter,
      renderPage: (url, readySelector) => renderPage(browser, url, readySelector, renderTimeoutMs),
      httpGet: async (url, headers) => {
        const res = await fetch(url, { headers })
        return { status: res.status, body: await res.text() }
      },
      scoreJob,
      upsertJobs: (jobs) => upsertJobs(client, jobs),
      recordSourceRun: (result) => recordSourceRun(client, result),
    })
    const { sources, extracted, inserted, failedSources } = summary
    console.log('[scrape] done', { sources, extracted, inserted, failedSources })

    const summaryFile = process.env.GITHUB_STEP_SUMMARY
    if (summaryFile) {
      appendFileSync(summaryFile, buildRunSummaryMarkdown(summary))
    }
  } finally {
    await browser.close()
  }
}

main().catch((err: unknown) => {
  console.error('[scrape] fatal:', (err as Error).message)
  process.exit(1)
})
