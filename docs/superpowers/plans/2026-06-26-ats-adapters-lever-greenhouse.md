# ATS adapters (Lever / Greenhouse) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract real remote jobs from Lever- and Greenhouse-hosted company boards via their public JSON APIs, with one `scraping_sources` row per target company.

**Architecture:** Two new API-based adapters mirroring `scraper/adapters/github.ts` — each has a `fetch` that derives an API URL from the source URL's company slug and a pure `parse` that maps JSON → `RawJob[]`, keeping only remote roles. Resolved by bare hostname in `scraper/adapters/index.ts`. A migration disables the unusable ATS root sources and seeds per-company rows.

**Tech Stack:** TypeScript (ESM, `.ts` extension imports), Vitest, Supabase SQL migrations. No new dependencies.

## Global Constraints

- Adapters implement the `Adapter` interface from `scraper/adapters/types.ts`: `host: string`, optional `fetch(url, ctx)`, pure `parse(content): RawJob[]`.
- `parse` is pure: no network, no async, no URL access. Anything `parse` needs that isn't in the API payload must be injected by `fetch`.
- `RawJob` shape: `{ title, company, url, location: string | null, description: string | null, published_at: string | null }`. `published_at` is ISO 8601 UTC or `null`.
- Date normalization uses `toIsoOrNull` from `scraper/adapters/dom.ts` (returns `null` for absent/unparseable, ISO string otherwise).
- Description truncation cap: `5000` chars (same as the GitHub adapter's `DESCRIPTION_MAX`).
- Recency is handled by the pipeline (`isRecent`), not the adapters — do NOT add recency filtering inside these adapters.
- Test files use `// @vitest-environment node` as the first line and import with explicit `.ts` extensions.
- Imports use explicit `.ts` extensions (ESM), matching existing adapters.

---

### Task 1: Lever adapter

**Files:**

- Create: `scraper/adapters/lever.ts`
- Test: `scraper/adapters/lever.spec.ts`

**Interfaces:**

- Consumes: `Adapter`, `FetchContext`, `RawJob` from `./types.ts`; `toIsoOrNull` from `./dom.ts`.
- Produces:
  - `parseLever(content: string): RawJob[]` — parses a `{ company: string; postings: LeverPosting[] }` JSON wrapper.
  - `fetchLever(sourceUrl: string, httpGet: FetchContext['httpGet']): Promise<string>` — returns `JSON.stringify({ company, postings })`.
  - `lever: Adapter` with `host: 'jobs.lever.co'`, `fetch`, `parse: parseLever`.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseLever, fetchLever, lever } from './lever.ts'

const wrapper = (postings: unknown[]) => JSON.stringify({ company: 'acme', postings })

describe('parseLever', () => {
  it('maps a remote posting (workplaceType) to RawJob', () => {
    const jobs = parseLever(
      wrapper([
        {
          text: 'Senior Backend Engineer',
          categories: { location: 'Remote - Worldwide', allLocations: ['Remote - Worldwide'] },
          workplaceType: 'remote',
          createdAt: 1717200000000,
          hostedUrl: 'https://jobs.lever.co/acme/abc-123',
          descriptionPlain: 'Build things.',
        },
      ])
    )
    expect(jobs).toEqual([
      {
        title: 'Senior Backend Engineer',
        company: 'acme',
        url: 'https://jobs.lever.co/acme/abc-123',
        location: 'Remote - Worldwide',
        description: 'Build things.',
        published_at: '2024-06-01T00:00:00.000Z',
      },
    ])
  })

  it('keeps a posting when allLocations matches /remote/i even if workplaceType is unset', () => {
    const jobs = parseLever(
      wrapper([
        {
          text: 'Designer',
          categories: { location: 'Anywhere', allLocations: ['São Paulo', 'Remote'] },
          createdAt: 1717200000000,
          hostedUrl: 'https://jobs.lever.co/acme/d-1',
        },
      ])
    )
    expect(jobs).toHaveLength(1)
    expect(jobs[0].title).toBe('Designer')
    expect(jobs[0].description).toBeNull()
  })

  it('drops non-remote postings (hybrid / on-site, no remote location)', () => {
    const jobs = parseLever(
      wrapper([
        {
          text: 'Office Manager',
          categories: { location: 'Arlington, TX', allLocations: ['Arlington, TX'] },
          workplaceType: 'on-site',
          createdAt: 1717200000000,
          hostedUrl: 'https://jobs.lever.co/acme/o-1',
        },
        {
          text: 'Hybrid Role',
          categories: { location: 'Berlin', allLocations: ['Berlin'] },
          workplaceType: 'hybrid',
          createdAt: 1717200000000,
          hostedUrl: 'https://jobs.lever.co/acme/h-1',
        },
      ])
    )
    expect(jobs).toEqual([])
  })

  it('skips postings missing title or hostedUrl', () => {
    const jobs = parseLever(
      wrapper([
        { workplaceType: 'remote', createdAt: 1717200000000, hostedUrl: 'https://x/1' },
        { text: 'No URL', workplaceType: 'remote', createdAt: 1717200000000 },
      ])
    )
    expect(jobs).toEqual([])
  })

  it('sets published_at to null when createdAt is absent', () => {
    const jobs = parseLever(
      wrapper([
        {
          text: 'Remote Eng',
          categories: { location: 'Remote' },
          workplaceType: 'remote',
          hostedUrl: 'https://jobs.lever.co/acme/n-1',
        },
      ])
    )
    expect(jobs[0].published_at).toBeNull()
  })

  it('returns [] for malformed JSON or non-array postings', () => {
    expect(parseLever('not json')).toEqual([])
    expect(parseLever(JSON.stringify({ company: 'acme', postings: 'nope' }))).toEqual([])
    expect(parseLever('{}')).toEqual([])
  })
})

describe('fetchLever', () => {
  it('derives the API URL from the slug and wraps the response with the company', async () => {
    const calls: string[] = []
    const httpGet = async (url: string) => {
      calls.push(url)
      return { status: 200, body: JSON.stringify([{ text: 'x' }]) }
    }
    const result = await fetchLever('https://jobs.lever.co/acme', httpGet)
    expect(calls[0]).toBe('https://api.lever.co/v0/postings/acme?mode=json')
    expect(JSON.parse(result)).toEqual({ company: 'acme', postings: [{ text: 'x' }] })
  })

  it('throws when no slug can be derived from the URL', async () => {
    const httpGet = async () => {
      throw new Error('should not be called')
    }
    await expect(fetchLever('https://jobs.lever.co', httpGet)).rejects.toThrow(/slug/)
  })

  it('throws on HTTP error status', async () => {
    const httpGet = async () => ({ status: 404, body: 'not found' })
    await expect(fetchLever('https://jobs.lever.co/acme', httpGet)).rejects.toThrow(/404/)
  })
})

describe('lever adapter', () => {
  it('exposes fetch + parse for host jobs.lever.co', () => {
    expect(lever.host).toBe('jobs.lever.co')
    expect(typeof lever.fetch).toBe('function')
    expect(typeof lever.parse).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scraper/adapters/lever.spec.ts`
Expected: FAIL — cannot resolve `./lever.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// scraper/adapters/lever.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scraper/adapters/lever.spec.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add scraper/adapters/lever.ts scraper/adapters/lever.spec.ts
git commit -m "feat(scraper): Lever ATS adapter (#25)"
```

---

### Task 2: Greenhouse adapter

**Files:**

- Create: `scraper/adapters/greenhouse.ts`
- Test: `scraper/adapters/greenhouse.spec.ts`

**Interfaces:**

- Consumes: `Adapter`, `FetchContext`, `RawJob` from `./types.ts`; `toIsoOrNull` from `./dom.ts`.
- Produces:
  - `parseGreenhouse(content: string): RawJob[]` — parses `{ jobs: GreenhouseJob[] }`.
  - `fetchGreenhouse(sourceUrl: string, httpGet: FetchContext['httpGet']): Promise<string>` — returns the raw API body.
  - `greenhouse: Adapter` with `host: 'boards.greenhouse.io'`, `fetch`, `parse: parseGreenhouse`.

- [ ] **Step 1: Write the failing test**

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseGreenhouse, fetchGreenhouse, greenhouse } from './greenhouse.ts'

const board = (jobs: unknown[]) => JSON.stringify({ jobs })

describe('parseGreenhouse', () => {
  it('maps a remote job and unescapes HTML entities in description', () => {
    const jobs = parseGreenhouse(
      board([
        {
          title: 'Staff Engineer',
          company_name: 'Acme',
          absolute_url: 'https://boards.greenhouse.io/acme/jobs/1',
          location: { name: 'Remote - Brazil' },
          first_published: '2026-06-02T08:58:57-04:00',
          updated_at: '2026-06-19T12:11:02-04:00',
          content: '&lt;p&gt;Hello &amp; welcome&lt;/p&gt;',
        },
      ])
    )
    expect(jobs).toEqual([
      {
        title: 'Staff Engineer',
        company: 'Acme',
        url: 'https://boards.greenhouse.io/acme/jobs/1',
        location: 'Remote - Brazil',
        description: '<p>Hello & welcome</p>',
        published_at: '2026-06-02T12:58:57.000Z',
      },
    ])
  })

  it('falls back to updated_at when first_published is absent', () => {
    const jobs = parseGreenhouse(
      board([
        {
          title: 'Remote Dev',
          company_name: 'Acme',
          absolute_url: 'https://boards.greenhouse.io/acme/jobs/2',
          location: { name: 'Remote' },
          updated_at: '2026-06-19T12:11:02-04:00',
        },
      ])
    )
    expect(jobs[0].published_at).toBe('2026-06-19T16:11:02.000Z')
    expect(jobs[0].description).toBeNull()
  })

  it('drops non-remote jobs by location name', () => {
    const jobs = parseGreenhouse(
      board([
        {
          title: 'On-site Role',
          company_name: 'Acme',
          absolute_url: 'https://boards.greenhouse.io/acme/jobs/3',
          location: { name: 'San Francisco, CA' },
          first_published: '2026-06-02T08:58:57-04:00',
        },
      ])
    )
    expect(jobs).toEqual([])
  })

  it('skips jobs missing title, company_name, or absolute_url', () => {
    const jobs = parseGreenhouse(
      board([
        { company_name: 'Acme', absolute_url: 'https://x/1', location: { name: 'Remote' } },
        { title: 'No company', absolute_url: 'https://x/2', location: { name: 'Remote' } },
        { title: 'No url', company_name: 'Acme', location: { name: 'Remote' } },
      ])
    )
    expect(jobs).toEqual([])
  })

  it('truncates description to 5000 chars', () => {
    const long = 'a'.repeat(6000)
    const jobs = parseGreenhouse(
      board([
        {
          title: 'Remote Dev',
          company_name: 'Acme',
          absolute_url: 'https://boards.greenhouse.io/acme/jobs/4',
          location: { name: 'Remote' },
          content: long,
        },
      ])
    )
    expect(jobs[0].description).toHaveLength(5000)
  })

  it('returns [] for malformed JSON or missing jobs array', () => {
    expect(parseGreenhouse('not json')).toEqual([])
    expect(parseGreenhouse('{}')).toEqual([])
    expect(parseGreenhouse(JSON.stringify({ jobs: 'nope' }))).toEqual([])
  })
})

describe('fetchGreenhouse', () => {
  it('derives the API URL from the slug and returns the raw body', async () => {
    const calls: string[] = []
    const body = board([])
    const httpGet = async (url: string) => {
      calls.push(url)
      return { status: 200, body }
    }
    const result = await fetchGreenhouse('https://boards.greenhouse.io/acme', httpGet)
    expect(calls[0]).toBe('https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true')
    expect(result).toBe(body)
  })

  it('throws when no slug can be derived from the URL', async () => {
    const httpGet = async () => {
      throw new Error('should not be called')
    }
    await expect(fetchGreenhouse('https://boards.greenhouse.io', httpGet)).rejects.toThrow(/slug/)
  })

  it('throws on HTTP error status', async () => {
    const httpGet = async () => ({ status: 404, body: 'not found' })
    await expect(fetchGreenhouse('https://boards.greenhouse.io/acme', httpGet)).rejects.toThrow(
      /404/
    )
  })
})

describe('greenhouse adapter', () => {
  it('exposes fetch + parse for host boards.greenhouse.io', () => {
    expect(greenhouse.host).toBe('boards.greenhouse.io')
    expect(typeof greenhouse.fetch).toBe('function')
    expect(typeof greenhouse.parse).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scraper/adapters/greenhouse.spec.ts`
Expected: FAIL — cannot resolve `./greenhouse.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// scraper/adapters/greenhouse.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scraper/adapters/greenhouse.spec.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add scraper/adapters/greenhouse.ts scraper/adapters/greenhouse.spec.ts
git commit -m "feat(scraper): Greenhouse ATS adapter (#25)"
```

---

### Task 3: Register adapters in the resolver

**Files:**

- Modify: `scraper/adapters/index.ts`
- Test: `scraper/adapters/index.spec.ts`

**Interfaces:**

- Consumes: `lever` from `./lever.ts`, `greenhouse` from `./greenhouse.ts` (Tasks 1–2).
- Produces: `resolveAdapter` returns `lever` for `jobs.lever.co` hosts and `greenhouse` for `boards.greenhouse.io` hosts.

- [ ] **Step 1: Write the failing test**

Add to `scraper/adapters/index.spec.ts`. First add the imports at the top (after the existing `github` import):

```ts
import { lever } from './lever.ts'
import { greenhouse } from './greenhouse.ts'
```

Then add this `it` block inside the `describe('resolveAdapter', ...)`:

```ts
it('resolves ATS hosts to their adapters', () => {
  expect(resolveAdapter('https://jobs.lever.co/acme')).toBe(lever)
  expect(resolveAdapter('https://boards.greenhouse.io/acme')).toBe(greenhouse)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scraper/adapters/index.spec.ts`
Expected: FAIL — `resolveAdapter` returns the generic adapter (`host: '*'`), not `lever`/`greenhouse`.

- [ ] **Step 3: Write minimal implementation**

In `scraper/adapters/index.ts`, add the imports:

```ts
import { lever } from './lever.ts'
import { greenhouse } from './greenhouse.ts'
```

And add both to the `adapters` array:

```ts
const adapters: Adapter[] = [
  weworkremotely,
  remotive,
  remoteok,
  euremotejobs,
  workingnomads,
  github,
  lever,
  greenhouse,
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scraper/adapters/index.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/adapters/index.ts scraper/adapters/index.spec.ts
git commit -m "feat(scraper): register Lever/Greenhouse adapters (#25)"
```

---

### Task 4: Migration — disable ATS roots and seed company sources

**Files:**

- Create: `supabase/migrations/0004_seed_ats_company_sources.sql`

**Interfaces:**

- Consumes: nothing from earlier tasks (independent SQL).
- Produces: ATS root sources disabled; per-company ATS source rows present with `is_active = true`.

This task has no unit test (SQL migration, matching the `0003` precedent). Verification is by reading the file and confirming idempotency. Use only real, currently-resolving company slugs. The seed list below is a starting point; during implementation, verify each slug returns jobs from its API before including it:

- Lever check: `curl -s "https://api.lever.co/v0/postings/<slug>?mode=json" | head -c 200` returns a non-empty JSON array.
- Greenhouse check: `curl -s "https://boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=true" | head -c 200` returns `{"jobs":[...`.

Drop any slug that returns `[]`, `{"jobs":[]}`, or an error, and substitute another known company. The acceptance bar is at least one working company per provider.

- [ ] **Step 1: Verify candidate slugs resolve**

Run (substitute/extend as needed):

```bash
for s in stripe; do echo "GH $s:"; curl -s --max-time 12 "https://boards-api.greenhouse.io/v1/boards/$s/jobs?content=true" | head -c 80; echo; done
for s in leverdemo; do echo "LV $s:"; curl -s --max-time 12 "https://api.lever.co/v0/postings/$s?mode=json" | head -c 80; echo; done
```

Expected: each prints job data (not `[]` / error). Replace any that fail with a known-good company slug before writing the file.

- [ ] **Step 2: Write the migration**

```sql
-- Seed per-company ATS sources and retire the generic ATS roots (issue #25).
-- Lever/Greenhouse roots (jobs.lever.co, boards.greenhouse.io) list no jobs
-- without a company slug, so they only ever time out. ATS adapters resolve by
-- host (scraper/adapters/index.ts) and hit the public JSON APIs per company.
-- Idempotent: re-running re-disables the roots and skips existing seed rows.

-- Retire the generic ATS roots (cannot resolve without a slug).
update scraping_sources set is_active = false
where url in ('https://jobs.lever.co', 'https://boards.greenhouse.io');

-- Seed per-company ATS targets. One row per company; the adapter resolves by host.
-- Replace/extend with companies known to post remote roles (see docs/scraper-sources.md).
insert into scraping_sources (url, label, is_active) values
  ('https://boards.greenhouse.io/stripe', 'Stripe (Greenhouse)', true),
  ('https://jobs.lever.co/leverdemo', 'Lever Demo (Lever)', true)
on conflict (url) do nothing;
```

- [ ] **Step 3: Verify idempotency by inspection**

Confirm the file uses `update ... set is_active = false` for roots and `on conflict (url) do nothing` for inserts, so re-running is a no-op. (No DB connection required for this plan; the migration runs via the project's normal Supabase migration flow.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_seed_ats_company_sources.sql
git commit -m "feat(scraper): seed ATS company sources, retire roots (#25)"
```

---

### Task 5: Documentation

**Files:**

- Modify: `docs/scraper-sources.md`

**Interfaces:**

- Consumes: nothing.
- Produces: updated triage doc with the #25 carve-out removed and an "Adding an ATS company target" section.

This task has no automated test. Verify by reading the rendered Markdown.

- [ ] **Step 1: Remove the #25 carve-out**

In `docs/scraper-sources.md`, the "Out of scope here" paragraph currently reads:

```
Out of scope here: Lever/Greenhouse ATS roots (tracked in #25) and the remote
boards still on the generic adapter (Jobspresso, JustRemote, JS Remotely,
AI Jobs, Remote Woman, Remote Circle — tracked under #23).
```

Change it to drop the Lever/Greenhouse clause:

```
Out of scope here: the remote boards still on the generic adapter (Jobspresso,
JustRemote, JS Remotely, AI Jobs, Remote Woman, Remote Circle — tracked under #23).
```

- [ ] **Step 2: Add the "Adding an ATS company target" section**

Append to the end of `docs/scraper-sources.md`:

````markdown
## Adding an ATS company target

Lever and Greenhouse are per-company ATSes — each target company is one row in
`scraping_sources`. The adapter resolves by host, so no code change is needed.

1. Find the company's ATS slug from its public careers URL:
   - Lever: `https://jobs.lever.co/<slug>`
   - Greenhouse: `https://boards.greenhouse.io/<slug>`
2. (Optional) Confirm the API returns jobs:
   - Lever: `https://api.lever.co/v0/postings/<slug>?mode=json`
   - Greenhouse: `https://boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=true`
3. Insert one row:

   ```sql
   insert into scraping_sources (url, label, is_active) values
     ('https://jobs.lever.co/<slug>', '<Company> (Lever)', true);
   ```
````

The adapter emits only remote roles (Lever `workplaceType = remote` or a
`/remote/i` location; Greenhouse a `/remote/i` `location.name`).

````

- [ ] **Step 3: Commit**

```bash
git add docs/scraper-sources.md
git commit -m "docs(scraper): document adding ATS company targets (#25)"
````

---

### Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm run test:run`
Expected: all tests pass, including the new `lever.spec.ts`, `greenhouse.spec.ts`, and the updated `index.spec.ts`.

- [ ] **Step 2: Type-check and lint**

Run: `npm run build && npm run lint`
Expected: no type errors, no lint errors.

- [ ] **Step 3: Confirm coverage holds**

Run: `npm run coverage`
Expected: passes the 80% line/function threshold.

---

## Notes for the implementer

- `published_at` for Lever: `createdAt` is epoch ms. `new Date(ms).toISOString()` then `toIsoOrNull` (defensive against `NaN`). Greenhouse dates are ISO strings with offsets — `toIsoOrNull` normalizes them to UTC `Z` form.
- Do not add recency filtering inside adapters; the pipeline's `isRecent` handles it.
- Keep `parse` pure — Lever's company name comes only from the `fetch` wrapper, never from the URL inside `parse`.
- Slug derivation throws on a bare root URL (no path segment), which surfaces as a recorded source error — exactly the behavior we want for a misconfigured root row.
