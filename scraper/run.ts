import 'dotenv/config'
import { appendFileSync } from 'node:fs'
import { launchBrowser, renderPage } from './render.ts'
import { resolveAdapter } from './adapters/index.ts'
import { scoreJob } from './score.ts'
import { createScraperClient, fetchActiveSources, upsertJobs, recordSourceRun } from './db.ts'
import { runScrape } from './pipeline.ts'
import { buildRunSummaryMarkdown } from './runSummary.ts'

const main = async (): Promise<void> => {
  const client = createScraperClient()
  const browser = await launchBrowser()
  try {
    const summary = await runScrape({
      fetchActiveSources: () => fetchActiveSources(client),
      resolveAdapter,
      renderPage: (url, readySelector) => renderPage(browser, url, readySelector),
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
