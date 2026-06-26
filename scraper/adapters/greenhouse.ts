import type { Adapter, FetchContext, RawJob } from './types.ts'
import { toIsoOrNull } from './dom.ts'

interface GreenhouseJob {
  title?: string
  company_name?: string
  absolute_url?: string
  location?: { name?: string }
  first_published?: string
  updated_at?: string
  content?: string
}

const DESCRIPTION_MAX = 5000

const unescapeHtml = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

export const parseGreenhouse = (content: string): RawJob[] => {
  let data: { jobs?: GreenhouseJob[] }
  try {
    data = JSON.parse(content)
  } catch {
    return []
  }
  if (!Array.isArray(data.jobs)) return []
  const jobs: RawJob[] = []
  for (const j of data.jobs) {
    const locationName = j.location?.name?.trim() || null
    if (!locationName || !/remote/i.test(locationName)) continue
    const title = j.title?.trim() || null
    const company = j.company_name?.trim() || null
    const url = j.absolute_url?.trim() || null
    if (!title || !company || !url) continue
    const rawContent = j.content?.trim()
    const description = rawContent ? unescapeHtml(rawContent).slice(0, DESCRIPTION_MAX) : null
    jobs.push({
      title,
      company,
      url,
      location: locationName,
      description,
      published_at: toIsoOrNull(j.first_published) ?? toIsoOrNull(j.updated_at),
    })
  }
  return jobs
}

const slugFromUrl = (sourceUrl: string): string => {
  const parts = new URL(sourceUrl).pathname.split('/').filter(Boolean)
  if (parts.length < 1) throw new Error(`cannot derive Greenhouse board slug from ${sourceUrl}`)
  return parts[0]
}

export const fetchGreenhouse = async (
  sourceUrl: string,
  httpGet: FetchContext['httpGet']
): Promise<string> => {
  const slug = slugFromUrl(sourceUrl)
  const { status, body } = await httpGet(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`
  )
  if (status >= 400) {
    throw new Error(`Greenhouse API ${status} for ${slug}`)
  }
  return body
}

export const greenhouse: Adapter = {
  host: 'boards.greenhouse.io',
  fetch: (url, ctx) => fetchGreenhouse(url, ctx.httpGet),
  parse: parseGreenhouse,
}
