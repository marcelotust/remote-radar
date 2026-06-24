import type { Adapter, FetchContext, RawJob } from './types.ts'

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

const PER_PAGE = 100
const RECENCY_DAYS = 60

const repoFromUrl = (sourceUrl: string): string => {
  const parts = new URL(sourceUrl).pathname.split('/').filter(Boolean)
  if (parts.length < 2) throw new Error(`cannot derive owner/repo from ${sourceUrl}`)
  return `${parts[0]}/${parts[1]}`
}

export const filterRecentIssues = <T extends { created_at?: string }>(
  issues: T[],
  cutoffIso: string
): { kept: T[]; reachedCutoff: boolean } => {
  const kept: T[] = []
  let reachedCutoff = false
  for (const issue of issues) {
    if (issue.created_at && issue.created_at >= cutoffIso) {
      kept.push(issue)
    } else {
      reachedCutoff = true
    }
  }
  return { kept, reachedCutoff }
}

export const fetchGithubIssues = async (
  sourceUrl: string,
  httpGet: FetchContext['httpGet'],
  now: Date = new Date()
): Promise<string> => {
  const repo = repoFromUrl(sourceUrl)
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'remote-radar-scraper',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  const cutoffIso = new Date(now.getTime() - RECENCY_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const all: unknown[] = []
  for (let page = 1; ; page += 1) {
    const url = `https://api.github.com/repos/${repo}/issues?state=open&labels=Remoto&sort=created&direction=desc&per_page=${PER_PAGE}&page=${page}`
    const { status, body } = await httpGet(url, headers)
    if (status >= 400) {
      throw new Error(`GitHub API ${status} for ${repo} page ${page}`)
    }
    const parsed = JSON.parse(body) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) break
    const { kept, reachedCutoff } = filterRecentIssues(
      parsed as { created_at?: string }[],
      cutoffIso
    )
    all.push(...kept)
    if (reachedCutoff || parsed.length < PER_PAGE) break
  }
  return JSON.stringify(all)
}

export const github: Adapter = {
  host: 'github.com',
  fetch: (url, ctx) => fetchGithubIssues(url, ctx.httpGet),
  parse: parseGithubIssues,
}
