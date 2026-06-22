import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'

const BASE = 'https://weworkremotely.com'

const text = (el: Element | null): string | null => el?.textContent?.trim() || null

export const parseWeWorkRemotely = (html: string): RawJob[] => {
  const { document } = new JSDOM(html).window
  const anchors = Array.from(document.querySelectorAll('section.jobs li a[href^="/remote-jobs/"]'))
  const jobs: RawJob[] = []
  for (const a of anchors) {
    const title = text(a.querySelector('.title'))
    const company = text(a.querySelector('.company'))
    const href = a.getAttribute('href')
    if (!title || !company || !href) continue
    jobs.push({
      title,
      company,
      url: `${BASE}${href}`,
      location: text(a.querySelector('.region')),
      description: null,
    })
  }
  return jobs
}

export const weworkremotely: Adapter = {
  host: 'weworkremotely.com',
  readySelector: 'section.jobs li a[href^="/remote-jobs/"]',
  parse: parseWeWorkRemotely,
}
