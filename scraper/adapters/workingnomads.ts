import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'
import { text, dateTime } from './dom.ts'

const BASE = 'https://www.workingnomads.com'

export const parseWorkingNomads = (html: string): RawJob[] => {
  const { document } = new JSDOM(html).window
  const anchors = Array.from(document.querySelectorAll('a.job-desktop[href^="/jobs/"]'))
  const jobs: RawJob[] = []
  for (const a of anchors) {
    const title = text(a.querySelector('h4'))
    const company = text(a.querySelector('.company'))
    const href = a.getAttribute('href')
    if (!title || !company || !href) continue
    jobs.push({
      title,
      company,
      url: `${BASE}${href}`,
      location: null,
      description: null,
      // Boards without a machine-readable <time datetime> yield null → ingested anyway (#56).
      published_at: dateTime(a),
    })
  }
  return jobs
}

export const workingnomads: Adapter = {
  host: 'workingnomads.com',
  readySelector: 'a.job-desktop[href^="/jobs/"]',
  parse: parseWorkingNomads,
}
