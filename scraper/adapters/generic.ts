import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'
import { toIsoOrNull } from './dom.ts'

type Obj = Record<string, unknown>

const asString = (v: unknown): string | null => (typeof v === 'string' ? v : null)

const collectPostings = (node: unknown, out: Obj[]): void => {
  if (Array.isArray(node)) {
    node.forEach((n) => collectPostings(n, out))
    return
  }
  if (node && typeof node === 'object') {
    const obj = node as Obj
    const type = obj['@type']
    if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
      out.push(obj)
    }
    if ('@graph' in obj) collectPostings(obj['@graph'], out)
  }
}

const locationOf = (posting: Obj): string | null => {
  const place = posting['jobLocation']
  const address = place && typeof place === 'object' ? (place as Obj)['address'] : undefined
  if (!address || typeof address !== 'object') return null
  const a = address as Obj
  const parts = [
    asString(a['addressLocality']),
    asString(a['addressRegion']),
    asString(a['addressCountry']),
  ]
  const joined = parts.filter(Boolean).join(', ')
  return joined || null
}

export const parseJsonLd = (html: string): RawJob[] => {
  const { document } = new JSDOM(html).window
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
  const postings: Obj[] = []
  for (const script of scripts) {
    try {
      collectPostings(JSON.parse(script.textContent ?? ''), postings)
    } catch {
      // skip malformed JSON-LD blocks
    }
  }
  const jobs: RawJob[] = []
  for (const p of postings) {
    const title = asString(p['title'])
    const org = p['hiringOrganization']
    const company = org && typeof org === 'object' ? asString((org as Obj)['name']) : null
    const url = asString(p['url'])
    if (!title || !company || !url) continue
    const datePosted = asString(p['datePosted'])
    const published_at = toIsoOrNull(datePosted)
    jobs.push({
      title,
      company,
      url,
      location: locationOf(p),
      description: asString(p['description']),
      published_at,
    })
  }
  return jobs
}

export const generic: Adapter = {
  host: '*',
  readySelector: 'script[type="application/ld+json"]',
  parse: parseJsonLd,
}
