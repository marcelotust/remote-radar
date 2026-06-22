import { chromium, type Browser } from 'playwright'

export const launchBrowser = (): Promise<Browser> => chromium.launch()

export const renderPage = async (
  browser: Browser,
  url: string,
  readySelector: string,
  timeoutMs = 15000
): Promise<string> => {
  const page = await browser.newPage()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    await page.waitForSelector(readySelector, { timeout: timeoutMs })
    return await page.content()
  } finally {
    await page.close()
  }
}
