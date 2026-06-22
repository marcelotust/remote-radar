import 'dotenv/config'
import { launchBrowser, renderPage } from './render.ts'
import { resolveAdapter } from './adapters/index.ts'
import { scoreJob } from './score.ts'
import { createScraperClient, fetchActiveSources, upsertJobs } from './db.ts'
import { runScrape } from './pipeline.ts'

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
    })
    console.log('[scrape] done', summary)
  } finally {
    await browser.close()
  }
}

main().catch((err: unknown) => {
  console.error('[scrape] fatal:', (err as Error).message)
  process.exit(1)
})
