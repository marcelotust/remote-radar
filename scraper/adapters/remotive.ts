import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'

interface RemotiveJob {
  title?: string
  company_name?: string
  url?: string
  candidate_required_location?: string
  description?: string
}

export const parseRemotive = (html: string): RawJob[] => {
  const { document } = new JSDOM(html).window
  const pre = document.querySelector('pre')
  if (!pre) return []
  let data: { jobs?: RemotiveJob[] }
  try {
    data = JSON.parse(pre.textContent ?? '')
  } catch {
    return []
  }
  const jobs: RawJob[] = []
  for (const j of data.jobs ?? []) {
    const title = j.title?.trim() || null
    const company = j.company_name?.trim() || null
    const url = j.url?.trim() || null
    if (!title || !company || !url) continue
    jobs.push({
      title,
      company,
      url,
      location: j.candidate_required_location?.trim() || null,
      description: j.description?.trim() || null,
    })
  }
  return jobs
}

export const remotive: Adapter = {
  host: 'remotive.com',
  readySelector: 'pre',
  parse: parseRemotive,
}
