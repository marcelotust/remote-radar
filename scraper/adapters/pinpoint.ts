import type { Adapter, FetchContext, RawJob } from './types.ts'
import { stripHtml } from './dom.ts'

interface PinpointPosting {
  title?: string
  url?: string
  workplace_type?: string
  description?: string
  location?: { name?: string }
}

interface PinpointWrapper {
  company?: string
  data?: PinpointPosting[]
}

const DESCRIPTION_MAX = 5000

export const parsePinpoint = (content: string): RawJob[] => {
  let data: PinpointWrapper
  try {
    data = JSON.parse(content)
  } catch {
    return []
  }
  if (!Array.isArray(data.data)) return []
  const company = data.company?.trim() || null
  if (!company) return []
  const jobs: RawJob[] = []
  for (const p of data.data) {
    if (p.workplace_type !== 'remote') continue
    const title = p.title?.trim() || null
    const url = p.url?.trim() || null
    if (!title || !url) continue
    jobs.push({
      title,
      company,
      url,
      location: p.location?.name?.trim() || null,
      description: p.description ? stripHtml(p.description).slice(0, DESCRIPTION_MAX) : null,
      published_at: null,
    })
  }
  return jobs
}

const slugFromUrl = (sourceUrl: string): string => {
  const slug = new URL(sourceUrl).hostname.split('.')[0]
  if (!slug || slug === 'pinpointhq') {
    throw new Error(`cannot derive Pinpoint subdomain from ${sourceUrl}`)
  }
  return slug
}

export const fetchPinpoint = async (
  sourceUrl: string,
  httpGet: FetchContext['httpGet']
): Promise<string> => {
  const slug = slugFromUrl(sourceUrl)
  const { status, body } = await httpGet(`https://${slug}.pinpointhq.com/postings.json`, {
    Accept: 'application/json',
  })
  if (status >= 400) {
    throw new Error(`Pinpoint API ${status} for ${slug}`)
  }
  const parsed = JSON.parse(body) as { data?: PinpointPosting[] }
  return JSON.stringify({ company: slug, data: parsed.data ?? [] })
}

export const pinpoint: Adapter = {
  host: 'pinpointhq.com',
  fetch: (url, ctx) => fetchPinpoint(url, ctx.httpGet),
  parse: parsePinpoint,
}
