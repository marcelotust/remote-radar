import type { Adapter, FetchContext, RawJob } from './types.ts'

interface RipplingJob {
  name?: string
  url?: string
  workLocation?: { label?: string }
}

interface RipplingWrapper {
  company?: string
  jobs?: RipplingJob[]
}

export const parseRippling = (content: string): RawJob[] => {
  let data: RipplingWrapper
  try {
    data = JSON.parse(content)
  } catch {
    return []
  }
  if (!Array.isArray(data.jobs)) return []
  const company = data.company?.trim() || null
  if (!company) return []
  const jobs: RawJob[] = []
  for (const j of data.jobs) {
    const location = j.workLocation?.label?.trim() || null
    if (!location || !/remote/i.test(location)) continue
    const title = j.name?.trim() || null
    const url = j.url?.trim() || null
    if (!title || !url) continue
    jobs.push({ title, company, url, location, description: null, published_at: null })
  }
  return jobs
}

const slugFromUrl = (sourceUrl: string): string => {
  const parts = new URL(sourceUrl).pathname.split('/').filter(Boolean)
  if (parts.length < 1) throw new Error(`cannot derive Rippling board slug from ${sourceUrl}`)
  return parts[0]
}

export const fetchRippling = async (
  sourceUrl: string,
  httpGet: FetchContext['httpGet']
): Promise<string> => {
  const slug = slugFromUrl(sourceUrl)
  const { status, body } = await httpGet(
    `https://api.rippling.com/platform/api/ats/v1/board/${slug}/jobs`
  )
  if (status >= 400) {
    throw new Error(`Rippling API ${status} for ${slug}`)
  }
  return JSON.stringify({ company: slug, jobs: JSON.parse(body) })
}

export const rippling: Adapter = {
  host: 'ats.rippling.com',
  fetch: (url, ctx) => fetchRippling(url, ctx.httpGet),
  parse: parseRippling,
}
