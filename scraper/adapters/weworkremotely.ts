import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'
import { text, dateTime } from './dom.ts'

const BASE = 'https://weworkremotely.com'

export const parseWeWorkRemotely = (html: string): RawJob[] => {
  const { document } = new JSDOM(html).window
  const anchors = Array.from(document.querySelectorAll('section.jobs li a[href^="/remote-jobs/"]'))
  const jobs: RawJob[] = []
  for (const a of anchors) {
    const title = text(a.querySelector('.new-listing__header__title__text'))
    const company = text(a.querySelector('.new-listing__company-name'))
    const href = a.getAttribute('href')
    if (!title || !company || !href) continue
    jobs.push({
      title,
      company,
      url: `${BASE}${href}`,
      location: text(a.querySelector('.new-listing__company-headquarters')),
      description: null,
      // Boards without a machine-readable <time datetime> yield null → ingested anyway (#56).
      published_at: dateTime(a),
    })
  }
  return jobs
}

export const weworkremotely: Adapter = {
  host: 'weworkremotely.com',
  readySelector: 'section.jobs li a[href^="/remote-jobs/"]',
  parse: parseWeWorkRemotely,
}
