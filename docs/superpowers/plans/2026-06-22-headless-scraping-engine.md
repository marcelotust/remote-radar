# Headless Scraping Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Node.js + Playwright scraper that extracts job listings from `scraping_sources`, scores them with the project's keyword rules, and upserts them into Supabase without duplicates — plus an in-app button that opens the GitHub Actions run page.

**Architecture:** A `scraper/` package (TypeScript, run via `tsx`) where Playwright only renders pages and each adapter's `parse(html)` is a pure, jsdom-based function (unit-testable against fixtures). Orchestration lives in a `runScrape(deps)` pipeline with injected dependencies so it can be tested without a browser or live DB. The scraper reuses the app's `computeRelevanceScore`/`KEYWORD_CONFIG` so scoring has a single source of truth. New `relevance_score`/`relevance_level` columns persist the score; `useJobs` prefers stored values and falls back to client-side compute.

**Tech Stack:** TypeScript, Playwright (chromium), jsdom, `@supabase/supabase-js` (service role), tsx, dotenv, Vitest, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-06-21-headless-scraping-engine-design.md`

## Global Constraints

- **Single source of truth for scoring:** the scraper imports `computeRelevanceScore` from `src/utils/scoring.ts` and `KEYWORD_CONFIG` from `src/utils/keywords.ts`. Never re-implement keyword logic.
- **Playwright is isolated:** only `scraper/render.ts` and `scraper/run.ts` may import `playwright`. `pipeline.ts` and all `*.spec.ts` must not, so tests run without a browser.
- **Service-role key is secret:** never log `SUPABASE_SERVICE_ROLE_KEY` or its value. Error logs include the source URL and message only.
- **Pure parse functions:** every adapter `parse(html: string): RawJob[]` uses `jsdom` and performs no network or async work.
- **ESLint limits:** one component/exported React component per file (`react/no-multi-comp`); files ≤ 250 lines (`max-lines`).
- **Scraper imports use explicit `.ts` extensions** (e.g. `'./db.ts'`, `'../src/utils/scoring.ts'`) — consistent with the repo's `allowImportingTsExtensions`.
- **Commit after each task** with the message shown in its final step.

---

## File Structure

**Created:**

- `scraper/adapters/types.ts` — `RawJob`, `Adapter` interfaces
- `scraper/adapters/generic.ts` — JSON-LD `JobPosting` fallback adapter
- `scraper/adapters/weworkremotely.ts` — one concrete board adapter
- `scraper/adapters/index.ts` — `resolveAdapter(url)`
- `scraper/adapters/__fixtures__/jsonld.html`, `weworkremotely.html` — test fixtures
- `scraper/score.ts` — `scoreJob(raw)` wrapper over shared scoring
- `scraper/db.ts` — `createScraperClient`, `fetchActiveSources`, `upsertJobs`
- `scraper/render.ts` — Playwright render (`launchBrowser`, `renderPage`)
- `scraper/pipeline.ts` — `runScrape(deps)` orchestrator (no Playwright)
- `scraper/run.ts` — thin entry that wires real deps
- `scraper/*.spec.ts` — unit tests co-located
- `tsconfig.scraper.json` — type-check config for `scraper/`
- `supabase/migrations/0001_relevance_columns.sql`
- `src/components/RunScraperButton/RunScraperButton.tsx` + `.spec.tsx`
- `.github/workflows/daily-scraper.yml`

**Modified:**

- `src/utils/scoring.ts` — word-boundary matching
- `src/utils/scoring.spec.ts` — boundary cases
- `src/utils/keywords.ts` — add `reactjs`, `vuejs`
- `src/hooks/useJobs.ts` — extract `enrichJobs`, prefer stored score
- `src/hooks/useJobs.spec.tsx` — `enrichJobs` tests
- `src/pages/WishlistPage.tsx` — render `RunScraperButton`
- `supabase/schema.sql` — add the two columns
- `package.json` — deps + scripts
- `.env.example` — new vars

---

## Task 1: Scoring — word-boundary matching

**Files:**

- Modify: `src/utils/scoring.ts`
- Modify: `src/utils/keywords.ts`
- Test: `src/utils/scoring.spec.ts`

**Interfaces:**

- Consumes: `KeywordConfig`, `RelevanceLevel` from `src/types`.
- Produces: `computeRelevanceScore(job, config)` (unchanged signature) now matching on word boundaries.

- [ ] **Step 1: Add failing boundary tests** — append to `src/utils/scoring.spec.ts`:

```ts
describe('computeRelevanceScore word boundaries', () => {
  const boundaryConfig: KeywordConfig = {
    positive: ['react', 'c#', '.net'],
    negative: ['java'],
  }

  it('does not match a keyword inside a larger word', () => {
    const job = { title: 'Senior JavaScript Engineer', description: null }
    // "java" must NOT match inside "javascript"
    const { score } = computeRelevanceScore(job, boundaryConfig)
    expect(score).toBe(0)
  })

  it('still matches standalone keywords next to punctuation', () => {
    const job = { title: 'React, C# and .NET developer', description: null }
    const { score } = computeRelevanceScore(job, boundaryConfig)
    expect(score).toBe(3)
  })

  it('matches a whole-word negative keyword', () => {
    const job = { title: 'Java Backend Engineer', description: null }
    const { score } = computeRelevanceScore(job, boundaryConfig)
    expect(score).toBe(-1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/scoring.spec.ts`
Expected: the first new test FAILS (current substring match scores `-1` for "JavaScript").

- [ ] **Step 3: Implement word-boundary matching** — replace the body of `src/utils/scoring.ts`:

```ts
import type { Job, KeywordConfig, RelevanceLevel } from '../types'

const matchesKeyword = (text: string, keyword: string): boolean => {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Boundaries via lookarounds (not \b, which breaks on '.', '#', '-').
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(text)
}

export const computeRelevanceScore = (
  job: Pick<Job, 'title' | 'description'>,
  config: KeywordConfig
): { score: number; level: RelevanceLevel } => {
  const text = `${job.title} ${job.description ?? ''}`.toLowerCase()

  const positiveMatches = config.positive.filter((kw) => matchesKeyword(text, kw))
  const negativeMatches = config.negative.filter((kw) => matchesKeyword(text, kw))

  const score = positiveMatches.length - negativeMatches.length

  const level: RelevanceLevel =
    score >= 3 ? 'high' : score >= 1 ? 'medium' : score === 0 ? 'low' : 'negative'

  return { score, level }
}
```

- [ ] **Step 4: Add compound keyword variants** — in `src/utils/keywords.ts`, add `'reactjs'` and `'vuejs'` to the `positive` array (so `ReactJS`/`VueJS` still score now that bare `react`/`vue` no longer match inside them):

```ts
  positive: [
    'react',
    'reactjs',
    'frontend',
    'front-end',
    'typescript',
    'remote',
    'next.js',
    'nextjs',
    'vue',
    'vuejs',
    'tailwind',
    'node',
  ],
```

- [ ] **Step 5: Run the full scoring suite**

Run: `npx vitest run src/utils/scoring.spec.ts`
Expected: PASS (all existing + new tests).

- [ ] **Step 6: Commit**

```bash
git add src/utils/scoring.ts src/utils/scoring.spec.ts src/utils/keywords.ts
git commit -m "feat: word-boundary keyword matching in relevance scoring (#17)"
```

---

## Task 2: useJobs — prefer stored relevance, extract enrichJobs

**Files:**

- Modify: `src/hooks/useJobs.ts`
- Test: `src/hooks/useJobs.spec.tsx`

**Interfaces:**

- Produces: `export const enrichJobs = (rawJobs: Job[], companies: Company[]): Job[]` — pure; prefers stored `relevance_score`/`relevance_level`, falls back to compute, then sorts by score desc and adds wishlist flags.
- Consumes: `computeRelevanceScore`, `KEYWORD_CONFIG`, `Job`, `Company`.

- [ ] **Step 1: Add failing tests for `enrichJobs`** — append to `src/hooks/useJobs.spec.tsx`:

```ts
import { enrichJobs } from './useJobs'
import type { Job, Company } from '../types'

const baseJob = (over: Partial<Job>): Job => ({
  id: 'j',
  title: 'Dev',
  company: 'X',
  url: 'u',
  location: null,
  description: null,
  posted_at: null,
  scraped_at: '',
  status: 'none',
  read: false,
  source_url: null,
  ...over,
})

describe('enrichJobs', () => {
  it('prefers a stored relevance score over recomputing', () => {
    const job = baseJob({
      title: 'React TypeScript Remote',
      relevance_score: 99,
      relevance_level: 'high',
    })
    const [out] = enrichJobs([job], [])
    expect(out.relevance_score).toBe(99) // not the ~3 a recompute would give
    expect(out.relevance_level).toBe('high')
  })

  it('computes the score when none is stored', () => {
    const job = baseJob({ title: 'React TypeScript Remote' })
    const [out] = enrichJobs([job], [])
    expect(out.relevance_score).toBe(3)
    expect(out.relevance_level).toBe('high')
  })

  it('flags wishlist companies', () => {
    const job = baseJob({ company: 'Stripe' })
    const companies: Company[] = [
      { id: 'c', name: 'Stripe', website: null, notes: null, remote_brazil: 'yes', created_at: '' },
    ]
    const [out] = enrichJobs([job], companies)
    expect(out.is_wishlist_company).toBe(true)
    expect(out.wishlist_remote_brazil).toBe('yes')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useJobs.spec.tsx`
Expected: FAIL — `enrichJobs` is not exported.

- [ ] **Step 3: Implement** — replace `src/hooks/useJobs.ts` with:

```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { computeRelevanceScore } from '../utils/scoring'
import { KEYWORD_CONFIG } from '../utils/keywords'
import { useCompanies } from './useCompanies'
import type { Company, Job, RelevanceLevel } from '../types'

export const JOBS_KEY = ['jobs'] as const

export const enrichJobs = (rawJobs: Job[], companies: Company[]): Job[] => {
  const wishlistMap = new Map(companies.map((c) => [c.name.toLowerCase(), c]))
  return rawJobs
    .map((job) => {
      const hasStored = job.relevance_score != null && job.relevance_level != null
      const score = hasStored
        ? (job.relevance_score as number)
        : computeRelevanceScore(job, KEYWORD_CONFIG).score
      const level: RelevanceLevel = hasStored
        ? (job.relevance_level as RelevanceLevel)
        : computeRelevanceScore(job, KEYWORD_CONFIG).level
      const wishlistCompany = wishlistMap.get(job.company.toLowerCase())
      return {
        ...job,
        relevance_score: score,
        relevance_level: level,
        is_wishlist_company: !!wishlistCompany,
        wishlist_remote_brazil: wishlistCompany?.remote_brazil,
      }
    })
    .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
}

export const useJobs = () => {
  const { data: companies = [] } = useCompanies()

  return useQuery<Job[]>({
    queryKey: JOBS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*')
      if (error) throw error
      return data as Job[]
    },
    select: (rawJobs) => enrichJobs(rawJobs, companies),
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useJobs.spec.tsx`
Expected: PASS (existing `useJobs` tests + new `enrichJobs` tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useJobs.ts src/hooks/useJobs.spec.tsx
git commit -m "feat: prefer stored relevance score in useJobs via enrichJobs (#17)"
```

---

## Task 3: Database — relevance columns

**Files:**

- Create: `supabase/migrations/0001_relevance_columns.sql`
- Modify: `supabase/schema.sql`

**Interfaces:**

- Produces: `jobs.relevance_score int`, `jobs.relevance_level text` columns (the scraper writes these in Task 9).

- [ ] **Step 1: Create the migration** — `supabase/migrations/0001_relevance_columns.sql`:

```sql
-- Persist scraper-computed relevance so the app can read it without recomputing.
alter table jobs add column if not exists relevance_score int;
alter table jobs add column if not exists relevance_level text
  check (relevance_level in ('high', 'medium', 'low', 'negative'));
```

- [ ] **Step 2: Update `schema.sql`** — in `supabase/schema.sql`, add the two columns to the `jobs` table definition immediately after the `source_url  text` line:

```sql
  read        boolean not null default false,
  source_url  text,
  relevance_score int,
  relevance_level text
              check (relevance_level in ('high', 'medium', 'low', 'negative'))
```

(Adjust the trailing comma on `source_url` as shown.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_relevance_columns.sql supabase/schema.sql
git commit -m "feat: add relevance_score/level columns to jobs (#17)"
```

> **Manual step (record, do not block):** apply `0001_relevance_columns.sql` in the Supabase SQL editor before the first scraper run.

---

## Task 4: Tooling, deps, and scraper type-check config

**Files:**

- Modify: `package.json`
- Create: `tsconfig.scraper.json`
- Modify: `.env.example`

**Interfaces:**

- Produces: `npm run scrape`, `npm run typecheck:scraper`; devDeps `playwright`, `tsx`, `dotenv`, `@types/jsdom`.

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install -D playwright tsx dotenv @types/jsdom
```

Expected: `package.json` devDependencies updated; `jsdom` is already present.

- [ ] **Step 2: Add scripts** — in `package.json` `scripts`, add:

```json
    "scrape": "tsx scraper/run.ts",
    "typecheck:scraper": "tsc --noEmit -p tsconfig.scraper.json",
```

- [ ] **Step 3: Create `tsconfig.scraper.json`**:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "types": ["node"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["scraper", "src/utils/scoring.ts", "src/utils/keywords.ts", "src/types/index.ts"]
}
```

- [ ] **Step 4: Extend `.env.example`** — append:

```bash
# Scraper (server-side only; never exposed to the browser)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Run-scraper button: link to the GitHub Actions workflow "Run workflow" page
VITE_GITHUB_WORKFLOW_URL=https://github.com/marcelotust/remote-radar/actions/workflows/daily-scraper.yml
```

- [ ] **Step 5: Verify type-check runs (expected: no scraper files yet → trivial pass or "no inputs")**

Run: `npm run typecheck:scraper || true`
Expected: command exists and runs (it may report no input files until Task 5+).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.scraper.json .env.example
git commit -m "chore: scraper tooling (playwright, tsx, dotenv) and env vars (#17)"
```

---

## Task 5: Adapter interfaces

**Files:**

- Create: `scraper/adapters/types.ts`

**Interfaces:**

- Produces:

  ```ts
  interface RawJob {
    title: string
    company: string
    url: string
    location: string | null
    description: string | null
  }
  interface Adapter {
    host: string
    readySelector: string
    parse(html: string): RawJob[]
  }
  ```

- [ ] **Step 1: Create `scraper/adapters/types.ts`**:

```ts
export interface RawJob {
  title: string
  company: string
  url: string
  location: string | null
  description: string | null
}

export interface Adapter {
  /** Bare hostname (no `www.`), or '*' for the generic fallback. */
  host: string
  /** Selector to wait for before capturing HTML (proves dynamic content rendered). */
  readySelector: string
  /** Pure extraction from rendered HTML. No network, no async. */
  parse(html: string): RawJob[]
}
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck:scraper`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add scraper/adapters/types.ts
git commit -m "feat: scraper adapter interfaces (#17)"
```

---

## Task 6: Generic JSON-LD adapter

**Files:**

- Create: `scraper/adapters/generic.ts`
- Create: `scraper/adapters/__fixtures__/jsonld.html`
- Test: `scraper/adapters/generic.spec.ts`

**Interfaces:**

- Consumes: `Adapter`, `RawJob` from `./types.ts`.
- Produces: `export const generic: Adapter`; `export const parseJsonLd = (html: string): RawJob[]`.

- [ ] **Step 1: Create the fixture** — `scraper/adapters/__fixtures__/jsonld.html`:

```html
<!doctype html>
<html>
  <head>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Senior Frontend Engineer",
        "description": "Build React and TypeScript apps. Remote friendly.",
        "url": "https://example.com/jobs/frontend",
        "hiringOrganization": { "@type": "Organization", "name": "Acme Inc" },
        "jobLocation": {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Remote",
            "addressCountry": "BR"
          }
        }
      }
    </script>
    <script type="application/ld+json">
      { "@context": "https://schema.org", "@type": "WebSite", "name": "Not a job" }
    </script>
  </head>
  <body></body>
</html>
```

- [ ] **Step 2: Write the failing test** — `scraper/adapters/generic.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseJsonLd } from './generic.ts'

const html = readFileSync(
  fileURLToPath(new URL('./__fixtures__/jsonld.html', import.meta.url)),
  'utf8'
)

describe('parseJsonLd', () => {
  it('extracts JobPosting entries and ignores non-jobs', () => {
    const jobs = parseJsonLd(html)
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toEqual({
      title: 'Senior Frontend Engineer',
      company: 'Acme Inc',
      url: 'https://example.com/jobs/frontend',
      location: 'Remote, BR',
      description: 'Build React and TypeScript apps. Remote friendly.',
    })
  })

  it('returns [] when there is no JSON-LD', () => {
    expect(parseJsonLd('<html><body>nothing</body></html>')).toEqual([])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run scraper/adapters/generic.spec.ts`
Expected: FAIL — `./generic.ts` not found.

- [ ] **Step 4: Implement** — `scraper/adapters/generic.ts`:

```ts
import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'

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
    jobs.push({
      title,
      company,
      url,
      location: locationOf(p),
      description: asString(p['description']),
    })
  }
  return jobs
}

export const generic: Adapter = {
  host: '*',
  readySelector: 'script[type="application/ld+json"]',
  parse: parseJsonLd,
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run scraper/adapters/generic.spec.ts`
Expected: PASS.

- [ ] **Step 6: Type-check and commit**

```bash
npm run typecheck:scraper
git add scraper/adapters/generic.ts scraper/adapters/generic.spec.ts scraper/adapters/__fixtures__/jsonld.html
git commit -m "feat: generic JSON-LD JobPosting adapter (#17)"
```

---

## Task 7: We Work Remotely adapter

**Files:**

- Create: `scraper/adapters/weworkremotely.ts`
- Create: `scraper/adapters/__fixtures__/weworkremotely.html`
- Test: `scraper/adapters/weworkremotely.spec.ts`

**Interfaces:**

- Consumes: `Adapter`, `RawJob` from `./types.ts`.
- Produces: `export const weworkremotely: Adapter` (`host: 'weworkremotely.com'`).

- [ ] **Step 1: Create the fixture** — `scraper/adapters/__fixtures__/weworkremotely.html` (representative of WWR listing markup; reconciled against the live site in Step 7):

```html
<!doctype html>
<html>
  <body>
    <section class="jobs">
      <article>
        <ul>
          <li class="feature">
            <a href="/remote-jobs/acme-senior-react-engineer">
              <span class="title">Senior React Engineer</span>
              <span class="company">Acme</span>
              <span class="region company">Anywhere (100% Remote)</span>
            </a>
          </li>
          <li>
            <a href="/remote-jobs/globex-typescript-developer">
              <span class="title">TypeScript Developer</span>
              <span class="company">Globex</span>
              <span class="region company">Europe Only</span>
            </a>
          </li>
          <li class="view-all"><a href="/remote-full-stack-programming-jobs">View all</a></li>
        </ul>
      </article>
    </section>
  </body>
</html>
```

- [ ] **Step 2: Write the failing test** — `scraper/adapters/weworkremotely.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { weworkremotely } from './weworkremotely.ts'

const html = readFileSync(
  fileURLToPath(new URL('./__fixtures__/weworkremotely.html', import.meta.url)),
  'utf8'
)

describe('weworkremotely adapter', () => {
  it('targets the right host', () => {
    expect(weworkremotely.host).toBe('weworkremotely.com')
  })

  it('extracts listings with absolute URLs and skips non-job links', () => {
    const jobs = weworkremotely.parse(html)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Senior React Engineer',
      company: 'Acme',
      url: 'https://weworkremotely.com/remote-jobs/acme-senior-react-engineer',
      location: 'Anywhere (100% Remote)',
      description: null,
    })
    expect(jobs[1].company).toBe('Globex')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run scraper/adapters/weworkremotely.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement** — `scraper/adapters/weworkremotely.ts`:

```ts
import { JSDOM } from 'jsdom'
import type { Adapter, RawJob } from './types.ts'

const BASE = 'https://weworkremotely.com'

const text = (el: Element | null): string | null => el?.textContent?.trim() || null

export const parseWeWorkRemotely = (html: string): RawJob[] => {
  const { document } = new JSDOM(html).window
  const anchors = Array.from(document.querySelectorAll('section.jobs li a[href^="/remote-jobs/"]'))
  const jobs: RawJob[] = []
  for (const a of anchors) {
    const title = text(a.querySelector('.title'))
    const company = text(a.querySelector('.company'))
    const href = a.getAttribute('href')
    if (!title || !company || !href) continue
    jobs.push({
      title,
      company,
      url: `${BASE}${href}`,
      location: text(a.querySelector('.region')),
      description: null,
    })
  }
  return jobs
}

export const weworkremotely: Adapter = {
  host: 'weworkremotely.com',
  readySelector: 'section.jobs li a[href^="/remote-jobs/"]',
  parse: parseWeWorkRemotely,
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run scraper/adapters/weworkremotely.spec.ts`
Expected: PASS.

- [ ] **Step 6: Type-check and commit**

```bash
npm run typecheck:scraper
git add scraper/adapters/weworkremotely.ts scraper/adapters/weworkremotely.spec.ts scraper/adapters/__fixtures__/weworkremotely.html
git commit -m "feat: We Work Remotely adapter (#17)"
```

- [ ] **Step 7: Live reconciliation (manual, after Task 11 wiring exists)** — once `render.ts` is in place, capture the real page and confirm selectors:

```bash
node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('https://weworkremotely.com/remote-full-stack-programming-jobs',{waitUntil:'domcontentloaded'});console.log((await p.content()).slice(0,4000));await b.close()})()"
```

If the live markup differs from the fixture, update `__fixtures__/weworkremotely.html`, the selectors in `weworkremotely.ts`, and the test together, then re-run Step 5. Record the outcome.

---

## Task 8: Adapter registry

**Files:**

- Create: `scraper/adapters/index.ts`
- Test: `scraper/adapters/index.spec.ts`

**Interfaces:**

- Consumes: `generic`, `weworkremotely`, `Adapter`.
- Produces: `export const resolveAdapter = (sourceUrl: string): Adapter`.

- [ ] **Step 1: Write the failing test** — `scraper/adapters/index.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveAdapter } from './index.ts'

describe('resolveAdapter', () => {
  it('matches a known host (ignoring www.)', () => {
    expect(resolveAdapter('https://www.weworkremotely.com/remote-jobs').host).toBe(
      'weworkremotely.com'
    )
  })

  it('falls back to the generic adapter for unknown hosts', () => {
    expect(resolveAdapter('https://remoteok.com').host).toBe('*')
  })

  it('falls back to generic for invalid URLs', () => {
    expect(resolveAdapter('not a url').host).toBe('*')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scraper/adapters/index.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `scraper/adapters/index.ts`:

```ts
import type { Adapter } from './types.ts'
import { generic } from './generic.ts'
import { weworkremotely } from './weworkremotely.ts'

const adapters: Adapter[] = [weworkremotely]

export const resolveAdapter = (sourceUrl: string): Adapter => {
  let host = ''
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, '')
  } catch {
    return generic
  }
  return adapters.find((a) => host === a.host || host.endsWith(`.${a.host}`)) ?? generic
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scraper/adapters/index.spec.ts`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

```bash
npm run typecheck:scraper
git add scraper/adapters/index.ts scraper/adapters/index.spec.ts
git commit -m "feat: adapter registry with host resolution (#17)"
```

---

## Task 9: Score wrapper

**Files:**

- Create: `scraper/score.ts`
- Test: `scraper/score.spec.ts`

**Interfaces:**

- Consumes: `computeRelevanceScore` (`../src/utils/scoring.ts`), `KEYWORD_CONFIG` (`../src/utils/keywords.ts`), `RawJob`, `RelevanceLevel`.
- Produces: `export const scoreJob = (raw: RawJob): { relevance_score: number; relevance_level: RelevanceLevel }`.

- [ ] **Step 1: Write the failing test** — `scraper/score.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { scoreJob } from './score.ts'

describe('scoreJob', () => {
  it('scores using the shared keyword config', () => {
    const result = scoreJob({
      title: 'Remote React TypeScript Engineer',
      company: 'Acme',
      url: 'https://x/1',
      location: 'Remote',
      description: 'Next.js and Tailwind',
    })
    expect(result.relevance_score).toBeGreaterThanOrEqual(3)
    expect(result.relevance_level).toBe('high')
  })

  it('does not match java inside javascript (shared boundary rule)', () => {
    const result = scoreJob({
      title: 'JavaScript Developer',
      company: 'Acme',
      url: 'https://x/2',
      location: null,
      description: null,
    })
    expect(result.relevance_score).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scraper/score.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `scraper/score.ts`:

```ts
import { computeRelevanceScore } from '../src/utils/scoring.ts'
import { KEYWORD_CONFIG } from '../src/utils/keywords.ts'
import type { RelevanceLevel } from '../src/types/index.ts'
import type { RawJob } from './adapters/types.ts'

export const scoreJob = (
  raw: RawJob
): { relevance_score: number; relevance_level: RelevanceLevel } => {
  const { score, level } = computeRelevanceScore(
    { title: raw.title, description: raw.description },
    KEYWORD_CONFIG
  )
  return { relevance_score: score, relevance_level: level }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scraper/score.spec.ts`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

```bash
npm run typecheck:scraper
git add scraper/score.ts scraper/score.spec.ts
git commit -m "feat: scraper score wrapper reusing shared scoring (#17)"
```

---

## Task 10: Supabase data layer

**Files:**

- Create: `scraper/db.ts`
- Test: `scraper/db.spec.ts`

**Interfaces:**

- Produces:
  ```ts
  interface SourceRow {
    url: string
    label: string
  }
  interface JobRow {
    title: string
    company: string
    url: string
    location: string | null
    description: string | null
    source_url: string
    relevance_score: number
    relevance_level: string
  }
  const createScraperClient: () => SupabaseClient
  const fetchActiveSources: (client: Pick<SupabaseClient, 'from'>) => Promise<SourceRow[]>
  const upsertJobs: (
    client: Pick<SupabaseClient, 'from'>,
    jobs: JobRow[]
  ) => Promise<{ count: number }>
  ```
- Consumes: `@supabase/supabase-js`.

- [ ] **Step 1: Write the failing test** — `scraper/db.spec.ts` (uses a hand-rolled fake client; no real network):

```ts
import { describe, it, expect, vi } from 'vitest'
import { fetchActiveSources, upsertJobs, type JobRow } from './db.ts'

const sourcesClient = (rows: unknown) => ({
  from: () => ({
    select: () => ({
      eq: () => Promise.resolve({ data: rows, error: null }),
    }),
  }),
})

describe('fetchActiveSources', () => {
  it('returns active source rows', async () => {
    const client = sourcesClient([{ url: 'https://a.com', label: 'A' }])
    const rows = await fetchActiveSources(client as never)
    expect(rows).toEqual([{ url: 'https://a.com', label: 'A' }])
  })

  it('throws on a Supabase error', async () => {
    const client = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: null, error: new Error('boom') }) }),
      }),
    }
    await expect(fetchActiveSources(client as never)).rejects.toThrow('boom')
  })
})

describe('upsertJobs', () => {
  const job: JobRow = {
    title: 'T',
    company: 'C',
    url: 'u',
    location: null,
    description: null,
    source_url: 's',
    relevance_score: 1,
    relevance_level: 'medium',
  }

  it('upserts with onConflict url + ignoreDuplicates and returns the inserted count', async () => {
    const upsert = vi.fn(() => ({
      select: () => Promise.resolve({ data: [{ url: 'u' }], error: null }),
    }))
    const client = { from: () => ({ upsert }) }
    const result = await upsertJobs(client as never, [job])
    expect(result).toEqual({ count: 1 })
    expect(upsert).toHaveBeenCalledWith([job], { onConflict: 'url', ignoreDuplicates: true })
  })

  it('skips the call and returns 0 for an empty list', async () => {
    const upsert = vi.fn()
    const client = { from: () => ({ upsert }) }
    expect(await upsertJobs(client as never, [])).toEqual({ count: 0 })
    expect(upsert).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scraper/db.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `scraper/db.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface SourceRow {
  url: string
  label: string
}

export interface JobRow {
  title: string
  company: string
  url: string
  location: string | null
  description: string | null
  source_url: string
  relevance_score: number
  relevance_level: string
}

type DbClient = Pick<SupabaseClient, 'from'>

export const createScraperClient = (): SupabaseClient => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export const fetchActiveSources = async (client: DbClient): Promise<SourceRow[]> => {
  const { data, error } = await client
    .from('scraping_sources')
    .select('url,label')
    .eq('is_active', true)
  if (error) throw error
  return (data ?? []) as SourceRow[]
}

export const upsertJobs = async (client: DbClient, jobs: JobRow[]): Promise<{ count: number }> => {
  if (jobs.length === 0) return { count: 0 }
  const { data, error } = await client
    .from('jobs')
    .upsert(jobs, { onConflict: 'url', ignoreDuplicates: true })
    .select('url')
  if (error) throw error
  return { count: data?.length ?? 0 }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scraper/db.spec.ts`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

```bash
npm run typecheck:scraper
git add scraper/db.ts scraper/db.spec.ts
git commit -m "feat: scraper Supabase data layer with dedupe upsert (#17)"
```

---

## Task 11: Render layer (Playwright)

**Files:**

- Create: `scraper/render.ts`

**Interfaces:**

- Produces:
  ```ts
  const launchBrowser: () => Promise<Browser>
  const renderPage: (
    browser: Browser,
    url: string,
    readySelector: string,
    timeoutMs?: number
  ) => Promise<string>
  ```
- Consumes: `playwright`.

> No unit test: this is a thin wrapper over Playwright, verified by the manual smoke run in Task 13. It is excluded from coverage (lives outside `src/`).

- [ ] **Step 1: Implement** — `scraper/render.ts`:

```ts
import { chromium, type Browser } from 'playwright'

export const launchBrowser = (): Promise<Browser> => chromium.launch()

export const renderPage = async (
  browser: Browser,
  url: string,
  readySelector: string,
  timeoutMs = 15000
): Promise<string> => {
  const page = await browser.newPage()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
    await page.waitForSelector(readySelector, { timeout: timeoutMs })
    return await page.content()
  } finally {
    await page.close()
  }
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npm run typecheck:scraper
git add scraper/render.ts
git commit -m "feat: Playwright render layer (#17)"
```

---

## Task 12: Pipeline orchestrator

**Files:**

- Create: `scraper/pipeline.ts`
- Test: `scraper/pipeline.spec.ts`

**Interfaces:**

- Consumes: `RawJob`, `Adapter`, `JobRow`, `SourceRow`, `RelevanceLevel`.
- Produces:
  ```ts
  interface PipelineDeps {
    fetchActiveSources: () => Promise<SourceRow[]>
    resolveAdapter: (url: string) => Adapter
    renderPage: (url: string, readySelector: string) => Promise<string>
    scoreJob: (raw: RawJob) => { relevance_score: number; relevance_level: RelevanceLevel }
    upsertJobs: (jobs: JobRow[]) => Promise<{ count: number }>
  }
  interface ScrapeSummary {
    sources: number
    extracted: number
    inserted: number
    failedSources: number
  }
  const runScrape: (deps: PipelineDeps) => Promise<ScrapeSummary>
  ```
- **Must NOT import `playwright`** — `renderPage` arrives via deps.

- [ ] **Step 1: Write the failing test** — `scraper/pipeline.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { runScrape, type PipelineDeps } from './pipeline.ts'
import type { Adapter } from './adapters/types.ts'

const adapter = (jobs: { title: string; url: string }[]): Adapter => ({
  host: 'x',
  readySelector: 'body',
  parse: () =>
    jobs.map((j) => ({
      title: j.title,
      company: 'C',
      url: j.url,
      location: null,
      description: null,
    })),
})

const baseDeps = (over: Partial<PipelineDeps>): PipelineDeps => ({
  fetchActiveSources: async () => [{ url: 'https://a.com', label: 'A' }],
  resolveAdapter: () => adapter([{ title: 'Dev', url: 'https://a.com/1' }]),
  renderPage: async () => '<html></html>',
  scoreJob: () => ({ relevance_score: 2, relevance_level: 'medium' }),
  upsertJobs: async (jobs) => ({ count: jobs.length }),
  ...over,
})

describe('runScrape', () => {
  it('extracts, scores, and upserts rows with source_url', async () => {
    const upsertJobs = vi.fn(async (jobs) => ({ count: jobs.length }))
    const summary = await runScrape(baseDeps({ upsertJobs }))
    expect(summary).toEqual({ sources: 1, extracted: 1, inserted: 1, failedSources: 0 })
    expect(upsertJobs).toHaveBeenCalledWith([
      {
        title: 'Dev',
        company: 'C',
        url: 'https://a.com/1',
        location: null,
        description: null,
        source_url: 'https://a.com',
        relevance_score: 2,
        relevance_level: 'medium',
      },
    ])
  })

  it('isolates a failing source and still upserts the rest', async () => {
    const sources = [
      { url: 'https://bad.com', label: 'Bad' },
      { url: 'https://good.com', label: 'Good' },
    ]
    const renderPage = vi.fn(async (url: string) => {
      if (url === 'https://bad.com') throw new Error('render timeout')
      return '<html></html>'
    })
    const resolveAdapter = () => adapter([{ title: 'Dev', url: 'https://good.com/1' }])
    const upsertJobs = vi.fn(async (jobs) => ({ count: jobs.length }))
    const summary = await runScrape(
      baseDeps({ fetchActiveSources: async () => sources, renderPage, resolveAdapter, upsertJobs })
    )
    expect(summary).toEqual({ sources: 2, extracted: 1, inserted: 1, failedSources: 1 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scraper/pipeline.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `scraper/pipeline.ts`:

```ts
import type { Adapter, RawJob } from './adapters/types.ts'
import type { JobRow, SourceRow } from './db.ts'
import type { RelevanceLevel } from '../src/types/index.ts'

export interface PipelineDeps {
  fetchActiveSources: () => Promise<SourceRow[]>
  resolveAdapter: (url: string) => Adapter
  renderPage: (url: string, readySelector: string) => Promise<string>
  scoreJob: (raw: RawJob) => { relevance_score: number; relevance_level: RelevanceLevel }
  upsertJobs: (jobs: JobRow[]) => Promise<{ count: number }>
}

export interface ScrapeSummary {
  sources: number
  extracted: number
  inserted: number
  failedSources: number
}

export const runScrape = async (deps: PipelineDeps): Promise<ScrapeSummary> => {
  const sources = await deps.fetchActiveSources()
  const rows: JobRow[] = []
  let failedSources = 0

  for (const source of sources) {
    try {
      const adapter = deps.resolveAdapter(source.url)
      const html = await deps.renderPage(source.url, adapter.readySelector)
      for (const raw of adapter.parse(html)) {
        const { relevance_score, relevance_level } = deps.scoreJob(raw)
        rows.push({ ...raw, source_url: source.url, relevance_score, relevance_level })
      }
    } catch (err) {
      failedSources += 1
      console.warn(`[scrape] source failed: ${source.url} — ${(err as Error).message}`)
    }
  }

  const { count } = await deps.upsertJobs(rows)
  return { sources: sources.length, extracted: rows.length, inserted: count, failedSources }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scraper/pipeline.spec.ts`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

```bash
npm run typecheck:scraper
git add scraper/pipeline.ts scraper/pipeline.spec.ts
git commit -m "feat: scrape pipeline with per-source error isolation (#17)"
```

---

## Task 13: Entry point + smoke run

**Files:**

- Create: `scraper/run.ts`

**Interfaces:**

- Consumes: `dotenv`, `launchBrowser`/`renderPage`, `resolveAdapter`, `scoreJob`, `createScraperClient`/`fetchActiveSources`/`upsertJobs`, `runScrape`.

- [ ] **Step 1: Implement** — `scraper/run.ts`:

```ts
import 'dotenv/config'
import { launchBrowser, renderPage } from './render.ts'
import { resolveAdapter } from './adapters/index.ts'
import { scoreJob } from './score.ts'
import { createScraperClient, fetchActiveSources, upsertJobs } from './db.ts'
import { runScrape } from './pipeline.ts'

const main = async (): Promise<void> => {
  const client = createScraperClient()
  const browser = await launchBrowser()
  try {
    const summary = await runScrape({
      fetchActiveSources: () => fetchActiveSources(client),
      resolveAdapter,
      renderPage: (url, readySelector) => renderPage(browser, url, readySelector),
      scoreJob,
      upsertJobs: (jobs) => upsertJobs(client, jobs),
    })
    console.log('[scrape] done', summary)
  } finally {
    await browser.close()
  }
}

main().catch((err: unknown) => {
  console.error('[scrape] fatal:', (err as Error).message)
  process.exit(1)
})
```

- [ ] **Step 2: Type-check**

Run: `npm run typecheck:scraper`
Expected: PASS.

- [ ] **Step 3: Install the browser binary (one-time, local)**

Run: `npx playwright install chromium`
Expected: chromium downloaded.

- [ ] **Step 4: Smoke run against the live DB** — requires `.env` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the Task 3 migration applied:

Run: `npm run scrape`
Expected: logs `[scrape] done { sources: N, extracted: M, inserted: K, failedSources: F }` with no thrown error and no secret in the output. Now also perform Task 7 Step 7 (live selector reconciliation) and fix the WWR adapter if needed.

- [ ] **Step 5: Commit**

```bash
git add scraper/run.ts
git commit -m "feat: scraper entry point wiring deps to pipeline (#17)"
```

---

## Task 14: Run-scraper button

**Files:**

- Create: `src/components/RunScraperButton/RunScraperButton.tsx`
- Test: `src/components/RunScraperButton/RunScraperButton.spec.tsx`
- Modify: `src/pages/WishlistPage.tsx`

**Interfaces:**

- Produces: `export const RunScraperButton: () => JSX.Element | null`. Renders an external link to `import.meta.env.VITE_GITHUB_WORKFLOW_URL`; renders nothing when the var is unset.

- [ ] **Step 1: Write the failing test** — `src/components/RunScraperButton/RunScraperButton.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { RunScraperButton } from './RunScraperButton'

afterEach(() => vi.unstubAllEnvs())

describe('RunScraperButton', () => {
  it('renders an external link to the workflow when configured', () => {
    vi.stubEnv(
      'VITE_GITHUB_WORKFLOW_URL',
      'https://github.com/x/actions/workflows/daily-scraper.yml'
    )
    render(<RunScraperButton />)
    const link = screen.getByRole('link', { name: /run scraper/i })
    expect(link).toHaveAttribute('href', 'https://github.com/x/actions/workflows/daily-scraper.yml')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders nothing when the workflow URL is not configured', () => {
    vi.stubEnv('VITE_GITHUB_WORKFLOW_URL', '')
    const { container } = render(<RunScraperButton />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/RunScraperButton/RunScraperButton.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/components/RunScraperButton/RunScraperButton.tsx`:

```tsx
export const RunScraperButton = () => {
  const url = import.meta.env.VITE_GITHUB_WORKFLOW_URL as string | undefined
  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Run scraper"
      className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-500 transition-colors"
    >
      Run scraper
    </a>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/RunScraperButton/RunScraperButton.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Wire into `WishlistPage`** — in `src/pages/WishlistPage.tsx`, add the import after the other component imports:

```tsx
import { RunScraperButton } from '../components/RunScraperButton/RunScraperButton'
```

Then, in the "Fontes de scraping" section header, place the button next to the "Adicionar fonte" button by wrapping both in a flex container:

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-white font-semibold text-base">Fontes de scraping</h2>
  <div className="flex items-center gap-2">
    <RunScraperButton />
    <button
      onClick={() => setSourceModalOpen(true)}
      aria-label="Adicionar fonte"
      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
    >
      + Adicionar fonte
    </button>
  </div>
</div>
```

- [ ] **Step 6: Run the wishlist page tests**

Run: `npx vitest run src/pages/WishlistPage.spec.tsx src/components/RunScraperButton/RunScraperButton.spec.tsx`
Expected: PASS (the button is hidden in tests since `VITE_GITHUB_WORKFLOW_URL` is unset there, so existing assertions are unaffected).

- [ ] **Step 7: Commit**

```bash
git add src/components/RunScraperButton src/pages/WishlistPage.tsx
git commit -m "feat: run-scraper button linking to GitHub Actions (#17)"
```

---

## Task 15: GitHub Actions workflow (dispatch target)

**Files:**

- Create: `.github/workflows/daily-scraper.yml`

**Interfaces:**

- Produces: a workflow with `schedule` + `workflow_dispatch` that runs `npm run scrape`. Full CI hardening is owned by issue #18.

- [ ] **Step 1: Create the workflow** — `.github/workflows/daily-scraper.yml`:

```yaml
name: Daily Scraper

on:
  schedule:
    - cron: '0 9 * * *' # 09:00 UTC daily
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - run: npm ci

      - name: Resolve Playwright version
        id: pw
        run: echo "version=$(node -p "require('playwright/package.json').version")" >> "$GITHUB_OUTPUT"

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ steps.pw.outputs.version }}

      - name: Install Chromium
        run: npx playwright install --with-deps chromium

      - name: Type-check scraper
        run: npm run typecheck:scraper

      - name: Run scraper
        run: npm run scrape
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

- [ ] **Step 2: Validate YAML syntax**

Run: `node -e "const fs=require('fs');const s=fs.readFileSync('.github/workflows/daily-scraper.yml','utf8');if(!s.includes('workflow_dispatch'))throw new Error('missing dispatch trigger');console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/daily-scraper.yml
git commit -m "ci: daily scraper workflow with manual dispatch (#17)"
```

> **Manual step (record, do not block):** add repository secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in GitHub → Settings → Secrets, and set `VITE_GITHUB_WORKFLOW_URL` in the Vercel project env to this workflow's page URL.

---

## Task 16: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npm run test:run`
Expected: PASS, including all new `scraper/**` and `src/**` specs.

- [ ] **Step 2: Coverage threshold (src only)**

Run: `npm run coverage`
Expected: PASS at ≥ 80% lines/functions (scraper is outside `src/` and not counted; new `src/` code — `enrichJobs`, `RunScraperButton` — is covered).

- [ ] **Step 3: Lint + app build**

Run: `npm run lint && npm run build`
Expected: no lint errors; `tsc -b && vite build` succeeds.

- [ ] **Step 4: Scraper type-check**

Run: `npm run typecheck:scraper`
Expected: PASS.

- [ ] **Step 5: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore: verification fixups for scraping engine (#17)"
```

---

## Self-Review Notes

- **Spec coverage:** Playwright setup → Tasks 4/11; per-source adapters → 5/6/7/8; scoring (with word-boundary improvement) → 1/9; Supabase upsert dedupe → 3/10; modular separation → 5–13; trigger button → 14; minimal workflow → 15; stored-score app change → 2; env/tooling → 4; testing → each task + 16.
- **Type consistency:** `RawJob`/`Adapter` (Task 5) used verbatim in 6/7/8/9/12; `JobRow`/`SourceRow` (Task 10) consumed in 12/13; `runScrape`/`PipelineDeps` (Task 12) consumed in 13; `enrichJobs` (Task 2) signature matches its tests.
- **Playwright isolation:** only `render.ts` and `run.ts` import `playwright`; `pipeline.ts` receives `renderPage` via deps, keeping `pipeline.spec.ts` browser-free.
- **Known live-site risk:** the WWR fixture/selectors are representative and explicitly reconciled against the live page in Task 7 Step 7 / Task 13 Step 4.
