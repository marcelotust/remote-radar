import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'

const text = (el: Element | null): string | null =>
  el?.textContent?.replace(/\s+/g, ' ').trim() || null

export const parseEuRemoteJobs = (html: string): RawJob[] => {
  const { document } = new JSDOM(html).window
  const anchors = Array.from(document.querySelectorAll('a.job-card-link'))
  const jobs: RawJob[] = []
  for (const a of anchors) {
    const title = text(a.querySelector('.job-title'))
    const company = text(a.querySelector('.company-name'))
    const url = a.getAttribute('href')
    if (!title || !company || !url) continue
    jobs.push({
      title,
      company,
      url,
      location: text(a.querySelector('.meta-location')),
      description: null,
    })
  }
  return jobs
}

export const euremotejobs: Adapter = {
  host: 'euremotejobs.com',
  readySelector: 'a.job-card-link',
  parse: parseEuRemoteJobs,
}
