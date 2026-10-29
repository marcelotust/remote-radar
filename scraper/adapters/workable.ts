import type { Adapter, FetchContext, RawJob } from './types.ts'
import { stripHtml } from './dom.ts'

interface WorkableJob {
  title?: string
  url?: string
  telecommuting?: boolean
  published_on?: string
  created_at?: string
  city?: string
  state?: string
  country?: string
  description?: string
}

interface WorkableBoard {
  name?: string
  jobs?: WorkableJob[]
}

const DESCRIPTION_MAX = 5000

const toIso = (date: string | undefined): string | null => {
  if (!date) return null
  const t = Date.parse(date)
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}

const locationOf = (j: WorkableJob): string | null =>
  [j.city, j.state, j.country].filter((p) => p && p.trim()).join(', ') || null

export const parseWorkable = (content: string): RawJob[] => {
  let data: WorkableBoard
  try {
    data = JSON.parse(content)
  } catch {
    return []
  }
  if (!Array.isArray(data.jobs)) return []
  const company = data.name?.trim() || null
  if (!company) return []
  const jobs: RawJob[] = []
  for (const j of data.jobs) {
    if (!j.telecommuting) continue
    const title = j.title?.trim() || null
    const url = j.url?.trim() || null
    if (!title || !url) continue
    jobs.push({
      title,
      company,
      url,
      location: locationOf(j),
      description: j.description ? stripHtml(j.description).slice(0, DESCRIPTION_MAX) : null,
      published_at: toIso(j.published_on) ?? toIso(j.created_at),
    })
  }
  return jobs
}

const slugFromUrl = (sourceUrl: string): string => {
  const parts = new URL(sourceUrl).pathname.split('/').filter(Boolean)
  if (parts.length < 1) throw new Error(`cannot derive Workable account slug from ${sourceUrl}`)
  return parts[0]
}

export const fetchWorkable = async (
  sourceUrl: string,
  httpGet: FetchContext['httpGet']
): Promise<string> => {
  const slug = slugFromUrl(sourceUrl)
  const { status, body } = await httpGet(
    `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`
  )
  if (status >= 400) {
    throw new Error(`Workable API ${status} for ${slug}`)
  }
  return body
}

export const workable: Adapter = {
  host: 'apply.workable.com',
  fetch: (url, ctx) => fetchWorkable(url, ctx.httpGet),
  parse: parseWorkable,
}
