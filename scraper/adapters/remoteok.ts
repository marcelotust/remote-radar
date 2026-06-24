import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'

interface RemoteOkJob {
  position?: string
  company?: string
  url?: string
  location?: string
  description?: string
}

export const parseRemoteOk = (html: string): RawJob[] => {
  const { document } = new JSDOM(html).window
  const pre = document.querySelector('pre')
  if (!pre) return []
  let data: unknown
  try {
    data = JSON.parse(pre.textContent ?? '')
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []
  const jobs: RawJob[] = []
  for (const item of data as RemoteOkJob[]) {
    const title = item.position?.trim() || null
    const company = item.company?.trim() || null
    const url = item.url?.trim() || null
    if (!title || !company || !url) continue
    jobs.push({
      title,
      company,
      url,
      location: item.location?.trim() || null,
      description: item.description?.trim() || null,
    })
  }
  return jobs
}

export const remoteok: Adapter = {
  host: 'remoteok.com',
  readySelector: 'pre',
  parse: parseRemoteOk,
}
