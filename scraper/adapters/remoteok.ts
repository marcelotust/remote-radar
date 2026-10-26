import type { Adapter, FetchContext, RawJob } from './types.ts'
import { stripHtml, toIsoOrNull } from './dom.ts'

interface RemoteOkJob {
  position?: string
  company?: string
  url?: string
  location?: string
  description?: string
  date?: string
}

// Remote OK blocks headless Chromium (#91), but its public JSON API answers
// plain HTTP. The API terms ask for a link back to remoteok.com, which every
// job URL (remoteok.com/remote-jobs/…) already is.
export const REMOTE_OK_API = 'https://remoteok.com/api'

const DESCRIPTION_MAX = 5000

/** Parses the API's JSON array; its first element is a legal notice, not a job. */
export const parseRemoteOk = (json: string): RawJob[] => {
  let data: unknown
  try {
    data = JSON.parse(json)
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
      description: stripHtml(item.description ?? '').slice(0, DESCRIPTION_MAX) || null,
      published_at: toIsoOrNull(item.date),
    })
  }
  return jobs
}

export const fetchRemoteOk = async (httpGet: FetchContext['httpGet']): Promise<string> => {
  const { status, body } = await httpGet(REMOTE_OK_API)
  if (status >= 400) throw new Error(`Remote OK API ${status}`)
  return body
}

export const remoteok: Adapter = {
  host: 'remoteok.com',
  fetch: (_url, ctx) => fetchRemoteOk(ctx.httpGet),
  parse: parseRemoteOk,
}
