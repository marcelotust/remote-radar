import type { RawJob } from './types.ts'

interface GithubIssue {
  title?: string
  html_url?: string
  body?: string | null
  pull_request?: unknown
}

const NA = ' na '
const FALLBACK_SEPS = [' - ', ' – ', ' @ ']
const DESCRIPTION_MAX = 5000

export const extractTitleAndCompany = (rawTitle: string): { title: string; company: string } => {
  const stripped = rawTitle.replace(/^\s*\[[^\]]*\]\s*/, '').trim()

  let idx = stripped.lastIndexOf(NA)
  let sepLen = NA.length
  if (idx === -1) {
    for (const sep of FALLBACK_SEPS) {
      const i = stripped.lastIndexOf(sep)
      if (i > idx) {
        idx = i
        sepLen = sep.length
      }
    }
  }

  if (idx === -1) return { title: stripped, company: '—' }
  const title = stripped.slice(0, idx).trim()
  const company = stripped.slice(idx + sepLen).trim()
  if (!title || !company) return { title: stripped, company: '—' }
  return { title, company }
}

export const parseGithubIssues = (json: string): RawJob[] => {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return []
  }
  if (!Array.isArray(data)) return []

  const jobs: RawJob[] = []
  for (const item of data as GithubIssue[]) {
    if (item.pull_request) continue
    const rawTitle = item.title?.trim()
    const url = item.html_url?.trim()
    if (!rawTitle || !url) continue
    const { title, company } = extractTitleAndCompany(rawTitle)
    const body = item.body?.trim() ?? ''
    jobs.push({
      title,
      company,
      url,
      location: 'Remoto',
      description: body ? body.slice(0, DESCRIPTION_MAX) : null,
    })
  }
  return jobs
}
