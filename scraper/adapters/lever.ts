import type { Adapter, FetchContext, RawJob } from './types.ts'
import { toIsoOrNull } from './dom.ts'

interface LeverPosting {
  text?: string
  categories?: { location?: string; allLocations?: string[] }
  workplaceType?: string
  createdAt?: number
  hostedUrl?: string
  descriptionPlain?: string
}

interface LeverWrapper {
  company?: string
  postings?: LeverPosting[]
}

const isRemote = (p: LeverPosting): boolean => {
  if (p.workplaceType === 'remote') return true
  const locations = [p.categories?.location, ...(p.categories?.allLocations ?? [])]
  return locations.some((l) => l && /remote/i.test(l))
}

export const parseLever = (content: string): RawJob[] => {
  let data: LeverWrapper
  try {
    data = JSON.parse(content)
  } catch {
    return []
  }
  if (!Array.isArray(data.postings)) return []
  const company = data.company?.trim() || null
  const jobs: RawJob[] = []
  for (const p of data.postings) {
    if (!isRemote(p)) continue
    const title = p.text?.trim() || null
    const url = p.hostedUrl?.trim() || null
    if (!title || !company || !url) continue
    jobs.push({
      title,
      company,
      url,
      location: p.categories?.location?.trim() || null,
      description: p.descriptionPlain?.trim() || null,
      published_at:
        typeof p.createdAt === 'number' ? toIsoOrNull(new Date(p.createdAt).toISOString()) : null,
    })
  }
  return jobs
}

const slugFromUrl = (sourceUrl: string): string => {
  const parts = new URL(sourceUrl).pathname.split('/').filter(Boolean)
  if (parts.length < 1) throw new Error(`cannot derive Lever company slug from ${sourceUrl}`)
  return parts[0]
}

export const fetchLever = async (
  sourceUrl: string,
  httpGet: FetchContext['httpGet']
): Promise<string> => {
  const slug = slugFromUrl(sourceUrl)
  const { status, body } = await httpGet(`https://api.lever.co/v0/postings/${slug}?mode=json`)
  if (status >= 400) {
    throw new Error(`Lever API ${status} for ${slug}`)
  }
  return JSON.stringify({ company: slug, postings: JSON.parse(body) })
}

export const lever: Adapter = {
  host: 'jobs.lever.co',
  fetch: (url, ctx) => fetchLever(url, ctx.httpGet),
  parse: parseLever,
}
