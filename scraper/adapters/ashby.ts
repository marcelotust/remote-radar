import type { Adapter, FetchContext, RawJob } from './types.ts'

interface AshbyJob {
  title?: string
  jobUrl?: string
  location?: string
  workplaceType?: string
  publishedAt?: string
  descriptionHtml?: string
}

interface AshbyBoard {
  organizationName?: string
  jobs?: AshbyJob[]
}

const DESCRIPTION_MAX = 5000

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isRemote = (job: AshbyJob): boolean => /^remote$/i.test(job.workplaceType ?? '')

export const parseAshby = (content: string): RawJob[] => {
  let data: AshbyBoard
  try {
    data = JSON.parse(content)
  } catch {
    return []
  }
  if (!Array.isArray(data.jobs)) return []
  const company = data.organizationName?.trim() || null
  if (!company) return []
  const jobs: RawJob[] = []
  for (const j of data.jobs) {
    if (!isRemote(j)) continue
    const title = j.title?.trim() || null
    const url = j.jobUrl?.trim() || null
    if (!title || !url) continue
    const description = j.descriptionHtml
      ? stripHtml(j.descriptionHtml).slice(0, DESCRIPTION_MAX)
      : null
    jobs.push({
      title,
      company,
      url,
      location: j.location?.trim() || null,
      description,
      published_at: j.publishedAt ?? null,
    })
  }
  return jobs
}

const slugFromUrl = (sourceUrl: string): string => {
  const parts = new URL(sourceUrl).pathname.split('/').filter(Boolean)
  if (parts.length < 1) throw new Error(`cannot derive Ashby board slug from ${sourceUrl}`)
  return parts[0]
}

export const fetchAshby = async (
  sourceUrl: string,
  httpGet: FetchContext['httpGet']
): Promise<string> => {
  const slug = slugFromUrl(sourceUrl)
  const { status, body } = await httpGet(`https://api.ashbyhq.com/posting-api/job-board/${slug}`)
  if (status >= 400) {
    throw new Error(`Ashby API ${status} for ${slug}`)
  }
  const parsed = JSON.parse(body) as { jobs?: AshbyJob[] }
  return JSON.stringify({ organizationName: slug, jobs: parsed.jobs ?? [] })
}

export const ashby: Adapter = {
  host: 'jobs.ashbyhq.com',
  fetch: (url, ctx) => fetchAshby(url, ctx.httpGet),
  parse: parseAshby,
}
