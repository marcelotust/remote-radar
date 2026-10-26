import { JSDOM } from 'jsdom'
import type { Adapter, FetchContext, RawJob } from './types.ts'
import { stripHtml, text, toIsoOrNull } from './dom.ts'

// We Work Remotely blocks headless Chromium (#91) but serves plain RSS. The
// combined /remote-jobs.rss caps every category at 10 items, so read the
// per-category feeds for software roles instead; the ingest role filter drops
// the sysadmin-only listings the DevOps feed also carries.
export const WWR_FEEDS = [
  'https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
  'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
]

const DESCRIPTION_MAX = 5000

/** Parses the JSON array of RSS documents built by `fetchWeWorkRemotely`. */
export const parseWeWorkRemotely = (content: string): RawJob[] => {
  let feeds: unknown
  try {
    feeds = JSON.parse(content)
  } catch {
    return []
  }
  if (!Array.isArray(feeds)) return []
  const seen = new Set<string>()
  const jobs: RawJob[] = []
  for (const xml of feeds) {
    if (typeof xml !== 'string') continue
    const { document } = new JSDOM(xml, { contentType: 'text/xml' }).window
    for (const item of Array.from(document.querySelectorAll('item'))) {
      // Item titles read "Company: Role".
      const heading = text(item.querySelector('title'))
      const url = text(item.querySelector('link')) ?? text(item.querySelector('guid'))
      const sep = heading?.indexOf(': ') ?? -1
      if (!heading || !url || sep <= 0 || seen.has(url)) continue
      const company = heading.slice(0, sep).trim()
      const title = heading.slice(sep + 2).trim()
      if (!company || !title) continue
      seen.add(url)
      const html = item.querySelector('description')?.textContent ?? ''
      jobs.push({
        title,
        company,
        url,
        location: text(item.querySelector('region')) ?? text(item.querySelector('country')),
        description: stripHtml(html).slice(0, DESCRIPTION_MAX) || null,
        published_at: toIsoOrNull(text(item.querySelector('pubDate'))),
      })
    }
  }
  return jobs
}

export const fetchWeWorkRemotely = async (httpGet: FetchContext['httpGet']): Promise<string> => {
  const feeds = await Promise.all(
    WWR_FEEDS.map(async (feed) => {
      const { status, body } = await httpGet(feed)
      if (status >= 400) throw new Error(`We Work Remotely RSS ${status} for ${feed}`)
      return body
    })
  )
  return JSON.stringify(feeds)
}

export const weworkremotely: Adapter = {
  host: 'weworkremotely.com',
  fetch: (_url, ctx) => fetchWeWorkRemotely(ctx.httpGet),
  parse: parseWeWorkRemotely,
}
