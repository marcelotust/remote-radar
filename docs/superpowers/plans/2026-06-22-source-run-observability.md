# Per-Source Run Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record each scraping source's most-recent run outcome (when, jobs added, success/error) and show it on every `SourceCard`, plus harden the daily workflow (#18).

**Architecture:** The scraper pipeline is restructured from one batched upsert to per-source processing so each source's "jobs added" can be counted and persisted via an injected `recordSourceRun`. Four `last_run_*` columns on `scraping_sources` store the result (service-role writes, anon reads). The app's `SourceCard` renders a "Última run" line via a pure `formatLastRun` helper. The workflow gets a concurrency guard and a GitHub Step Summary built by a pure helper.

**Tech Stack:** TypeScript, `@supabase/supabase-js` (service role), Vitest, React, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-06-22-source-run-observability-design.md`

## Global Constraints

- **Single source of truth for scoring** stays intact — this feature does not touch scoring.
- **Service-role key never logged.** Error strings persisted to `last_run_error` are truncated to ≤300 chars.
- **Pipeline stays Playwright-free.** Only `scraper/render.ts` and `scraper/run.ts` import `playwright`; `pipeline.ts`, `runSummary.ts`, and all `*.spec.ts` must not.
- **`recordSourceRun` is injected** via `PipelineDeps` (like the other deps) — the pipeline never imports the DB client.
- **Scraper imports use explicit `.ts` extensions** for local files.
- **ESLint:** one exported React component per file (`react/no-multi-comp`); files ≤ 250 lines; avoid `react-refresh/only-export-components` warnings (keep non-component helpers in their own files).
- **Style:** no semicolons, single quotes.
- **`last_run_status` domain** is exactly `'success' | 'error'` (matches the SQL CHECK).
- Commit after each task with the message in its final step.

---

## File Structure

**Created:**

- `supabase/migrations/0002_source_last_run.sql`
- `scraper/runSummary.ts` + `scraper/runSummary.spec.ts`
- `src/components/SourceCard/formatLastRun.ts` + `formatLastRun.spec.ts`

**Modified:**

- `supabase/schema.sql` — `scraping_sources` columns
- `scraper/db.ts` — `SourceRunStatus`/`SourceRunResult` types + `recordSourceRun`
- `scraper/db.spec.ts` — `recordSourceRun` tests
- `scraper/pipeline.ts` — per-source restructure, `recordSourceRun` dep, `perSource` in summary
- `scraper/pipeline.spec.ts` — updated + new tests
- `scraper/run.ts` — wire `recordSourceRun`, write Step Summary
- `.github/workflows/daily-scraper.yml` — `concurrency` guard
- `src/types/index.ts` — `ScrapingSource` gains four optional fields
- `src/components/SourceCard/SourceCard.tsx` — render the "Última run" line
- `src/components/SourceCard/SourceCard.spec.tsx` — line states

**Note (no change needed):** `useEditSource` already patches only `{ label, url, is_active }` (`src/hooks/useSourceMutations.ts:30-34`), so there is no `last_run_*` clobber risk — the spec's concern is already satisfied. `useSources` already selects `*`, so the new columns flow through automatically.

---

## Task 1: Database columns

**Files:**

- Create: `supabase/migrations/0002_source_last_run.sql`
- Modify: `supabase/schema.sql`

**Interfaces:**

- Produces: `scraping_sources.last_run_at timestamptz`, `last_run_jobs_added int`, `last_run_status text` (CHECK success|error), `last_run_error text`.

- [ ] **Step 1: Create the migration** — `supabase/migrations/0002_source_last_run.sql`:

```sql
-- Per-source metadata about the most recent scraper run (issue #20).
alter table scraping_sources add column if not exists last_run_at         timestamptz;
alter table scraping_sources add column if not exists last_run_jobs_added int;
alter table scraping_sources add column if not exists last_run_status     text
  check (last_run_status in ('success', 'error'));
alter table scraping_sources add column if not exists last_run_error      text;
```

- [ ] **Step 2: Mirror in `schema.sql`** — in `supabase/schema.sql`, change the `scraping_sources` table so the columns are present for fresh installs. Replace the current block:

```sql
create table if not exists scraping_sources (
  id         uuid primary key default gen_random_uuid(),
  url        text not null unique,
  label      text not null,
  is_active  boolean not null default true,
  created_at timestamptz default now()
);
```

with:

```sql
create table if not exists scraping_sources (
  id                  uuid primary key default gen_random_uuid(),
  url                 text not null unique,
  label               text not null,
  is_active           boolean not null default true,
  created_at          timestamptz default now(),
  last_run_at         timestamptz,
  last_run_jobs_added int,
  last_run_status     text check (last_run_status in ('success', 'error')),
  last_run_error      text
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_source_last_run.sql supabase/schema.sql
git commit -m "feat: add last_run_* columns to scraping_sources (#20)"
```

> **Manual step (record, do not block):** apply `0002_source_last_run.sql` in the Supabase SQL editor before the next scraper run.

---

## Task 2: `recordSourceRun` data layer

**Files:**

- Modify: `scraper/db.ts`
- Test: `scraper/db.spec.ts`

**Interfaces:**

- Produces:
  ```ts
  export type SourceRunStatus = 'success' | 'error'
  export interface SourceRunResult {
    url: string
    status: SourceRunStatus
    jobsAdded: number
    error: string | null
  }
  export const recordSourceRun: (
    client: Pick<SupabaseClient, 'from'>,
    result: SourceRunResult
  ) => Promise<void>
  ```
- Consumes: existing `DbClient` type in `db.ts`.

- [ ] **Step 1: Write the failing tests** — append to `scraper/db.spec.ts` and update the import on line 2:

Change the import to:

```ts
import {
  fetchActiveSources,
  upsertJobs,
  recordSourceRun,
  type JobRow,
  type SourceRunResult,
} from './db.ts'
```

Append:

```ts
describe('recordSourceRun', () => {
  it('updates the source row by url with the last-run fields', async () => {
    const eq = vi.fn(() => Promise.resolve({ error: null }))
    const update = vi.fn(() => ({ eq }))
    const client = { from: () => ({ update }) }
    const result: SourceRunResult = {
      url: 'https://a.com',
      status: 'success',
      jobsAdded: 3,
      error: null,
    }
    await recordSourceRun(client as never, result)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_run_jobs_added: 3,
        last_run_status: 'success',
        last_run_error: null,
        last_run_at: expect.any(String),
      })
    )
    expect(eq).toHaveBeenCalledWith('url', 'https://a.com')
  })

  it('throws on a Supabase error', async () => {
    const client = {
      from: () => ({
        update: () => ({ eq: () => Promise.resolve({ error: new Error('boom') }) }),
      }),
    }
    const result: SourceRunResult = { url: 'u', status: 'error', jobsAdded: 0, error: 'x' }
    await expect(recordSourceRun(client as never, result)).rejects.toThrow('boom')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scraper/db.spec.ts`
Expected: FAIL — `recordSourceRun` / `SourceRunResult` not exported.

- [ ] **Step 3: Implement** — in `scraper/db.ts`, add after the `JobRow` interface (before `type DbClient`):

```ts
export type SourceRunStatus = 'success' | 'error'

export interface SourceRunResult {
  url: string
  status: SourceRunStatus
  jobsAdded: number
  error: string | null
}
```

and add at the end of the file:

```ts
export const recordSourceRun = async (client: DbClient, result: SourceRunResult): Promise<void> => {
  const { error } = await client
    .from('scraping_sources')
    .update({
      last_run_at: new Date().toISOString(),
      last_run_jobs_added: result.jobsAdded,
      last_run_status: result.status,
      last_run_error: result.error,
    })
    .eq('url', result.url)
  if (error) throw error
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scraper/db.spec.ts`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Type-check and commit**

```bash
npm run typecheck:scraper
git add scraper/db.ts scraper/db.spec.ts
git commit -m "feat: recordSourceRun writes last_run_* per source (#20)"
```

---

## Task 3: Pipeline per-source restructure

**Files:**

- Modify: `scraper/pipeline.ts`
- Test: `scraper/pipeline.spec.ts`

**Interfaces:**

- Consumes: `SourceRunResult` (from `./db.ts`, Task 2), `JobRow`/`SourceRow`, `Adapter`/`RawJob`, `RelevanceLevel`.
- Produces:

  ```ts
  interface PipelineDeps { ...existing...; recordSourceRun: (result: SourceRunResult) => Promise<void> }
  interface ScrapeSummary { sources; extracted; inserted; failedSources; perSource: SourceRunResult[] }
  ```

- [ ] **Step 1: Replace the test file** — overwrite `scraper/pipeline.spec.ts`:

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
  recordSourceRun: async () => {},
  ...over,
})

describe('runScrape', () => {
  it('extracts, scores, and upserts rows with source_url + per-source result', async () => {
    const upsertJobs = vi.fn(async (jobs) => ({ count: jobs.length }))
    const summary = await runScrape(baseDeps({ upsertJobs }))
    expect(summary).toEqual({
      sources: 1,
      extracted: 1,
      inserted: 1,
      failedSources: 0,
      perSource: [{ url: 'https://a.com', status: 'success', jobsAdded: 1, error: null }],
    })
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

  it('records a success result with jobsAdded 0 when a source yields no jobs', async () => {
    const recordSourceRun = vi.fn(async () => {})
    const summary = await runScrape(
      baseDeps({ resolveAdapter: () => adapter([]), recordSourceRun })
    )
    expect(summary.perSource).toEqual([
      { url: 'https://a.com', status: 'success', jobsAdded: 0, error: null },
    ])
    expect(recordSourceRun).toHaveBeenCalledWith({
      url: 'https://a.com',
      status: 'success',
      jobsAdded: 0,
      error: null,
    })
  })

  it('isolates a failing source, records an error result, and still upserts the rest', async () => {
    const sources = [
      { url: 'https://bad.com', label: 'Bad' },
      { url: 'https://good.com', label: 'Good' },
    ]
    const renderPage = vi.fn(async (url: string) => {
      if (url === 'https://bad.com') throw new Error('render timeout')
      return '<html></html>'
    })
    const resolveAdapter = () => adapter([{ title: 'Dev', url: 'https://good.com/1' }])
    const recordSourceRun = vi.fn(async () => {})
    const summary = await runScrape(
      baseDeps({
        fetchActiveSources: async () => sources,
        renderPage,
        resolveAdapter,
        recordSourceRun,
      })
    )
    expect(summary.sources).toBe(2)
    expect(summary.inserted).toBe(1)
    expect(summary.failedSources).toBe(1)
    expect(summary.perSource[0]).toEqual({
      url: 'https://bad.com',
      status: 'error',
      jobsAdded: 0,
      error: 'render timeout',
    })
    expect(summary.perSource[1]).toEqual({
      url: 'https://good.com',
      status: 'success',
      jobsAdded: 1,
      error: null,
    })
    expect(recordSourceRun).toHaveBeenCalledTimes(2)
  })

  it('does not abort the run when recordSourceRun itself throws', async () => {
    const recordSourceRun = vi.fn(async () => {
      throw new Error('metadata write failed')
    })
    const summary = await runScrape(baseDeps({ recordSourceRun }))
    expect(summary.inserted).toBe(1)
    expect(summary.perSource).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scraper/pipeline.spec.ts`
Expected: FAIL — `recordSourceRun` missing from deps / `perSource` missing from summary.

- [ ] **Step 3: Implement** — overwrite `scraper/pipeline.ts`:

```ts
import type { Adapter, RawJob } from './adapters/types.ts'
import type { JobRow, SourceRow, SourceRunResult } from './db.ts'
import type { RelevanceLevel } from '../src/types/index.ts'

export interface PipelineDeps {
  fetchActiveSources: () => Promise<SourceRow[]>
  resolveAdapter: (url: string) => Adapter
  renderPage: (url: string, readySelector: string) => Promise<string>
  scoreJob: (raw: RawJob) => { relevance_score: number; relevance_level: RelevanceLevel }
  upsertJobs: (jobs: JobRow[]) => Promise<{ count: number }>
  recordSourceRun: (result: SourceRunResult) => Promise<void>
}

export interface ScrapeSummary {
  sources: number
  extracted: number
  inserted: number
  failedSources: number
  perSource: SourceRunResult[]
}

const truncate = (s: string, max: number): string => (s.length > max ? s.slice(0, max) : s)

export const runScrape = async (deps: PipelineDeps): Promise<ScrapeSummary> => {
  const sources = await deps.fetchActiveSources()
  const perSource: SourceRunResult[] = []
  let extracted = 0
  let inserted = 0
  let failedSources = 0

  for (const source of sources) {
    let result: SourceRunResult
    try {
      const adapter = deps.resolveAdapter(source.url)
      const html = await deps.renderPage(source.url, adapter.readySelector)
      const rows: JobRow[] = adapter.parse(html).map((raw) => {
        const { relevance_score, relevance_level } = deps.scoreJob(raw)
        return { ...raw, source_url: source.url, relevance_score, relevance_level }
      })
      extracted += rows.length
      const { count } = await deps.upsertJobs(rows)
      inserted += count
      result = { url: source.url, status: 'success', jobsAdded: count, error: null }
    } catch (err) {
      failedSources += 1
      result = {
        url: source.url,
        status: 'error',
        jobsAdded: 0,
        error: truncate((err as Error).message, 300),
      }
      console.warn(`[scrape] source failed: ${source.url} — ${result.error}`)
    }

    try {
      await deps.recordSourceRun(result)
    } catch (err) {
      console.warn(`[scrape] could not record run for ${source.url} — ${(err as Error).message}`)
    }
    perSource.push(result)
  }

  return { sources: sources.length, extracted, inserted, failedSources, perSource }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scraper/pipeline.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Type-check and commit**

```bash
npm run typecheck:scraper
git add scraper/pipeline.ts scraper/pipeline.spec.ts
git commit -m "feat: per-source pipeline with recordSourceRun + perSource summary (#20)"
```

---

## Task 4: Run summary markdown helper

**Files:**

- Create: `scraper/runSummary.ts`
- Test: `scraper/runSummary.spec.ts`

**Interfaces:**

- Consumes: `ScrapeSummary` (from `./pipeline.ts`, Task 3).
- Produces: `export const buildRunSummaryMarkdown = (summary: ScrapeSummary): string`.
- **Must NOT import `playwright`.**

- [ ] **Step 1: Write the failing test** — `scraper/runSummary.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildRunSummaryMarkdown } from './runSummary.ts'
import type { ScrapeSummary } from './pipeline.ts'

const summary: ScrapeSummary = {
  sources: 2,
  extracted: 5,
  inserted: 4,
  failedSources: 1,
  perSource: [
    { url: 'https://weworkremotely.com', status: 'success', jobsAdded: 4, error: null },
    { url: 'https://arc.dev', status: 'error', jobsAdded: 0, error: 'timeout' },
  ],
}

describe('buildRunSummaryMarkdown', () => {
  it('renders the totals line', () => {
    const md = buildRunSummaryMarkdown(summary)
    expect(md).toContain('**2** sources')
    expect(md).toContain('**4** inserted')
    expect(md).toContain('**1** failed')
  })

  it('renders one table row per source including errors', () => {
    const md = buildRunSummaryMarkdown(summary)
    expect(md).toContain('| https://weworkremotely.com | success | 4 |')
    expect(md).toContain('| https://arc.dev | error | 0 |')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scraper/runSummary.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `scraper/runSummary.ts`:

```ts
import type { ScrapeSummary } from './pipeline.ts'

export const buildRunSummaryMarkdown = (summary: ScrapeSummary): string => {
  const lines: string[] = [
    '## Scraper run',
    '',
    `**${summary.sources}** sources · **${summary.extracted}** extracted · ` +
      `**${summary.inserted}** inserted · **${summary.failedSources}** failed`,
    '',
    '| Source | Status | Jobs added |',
    '| --- | --- | --- |',
  ]
  for (const r of summary.perSource) {
    lines.push(`| ${r.url} | ${r.status} | ${r.jobsAdded} |`)
  }
  return lines.join('\n') + '\n'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scraper/runSummary.spec.ts`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

```bash
npm run typecheck:scraper
git add scraper/runSummary.ts scraper/runSummary.spec.ts
git commit -m "feat: GitHub Step Summary markdown for scraper runs (#18)"
```

---

## Task 5: Wire run entry point

**Files:**

- Modify: `scraper/run.ts`

**Interfaces:**

- Consumes: `recordSourceRun` (Task 2), `buildRunSummaryMarkdown` (Task 4), `runScrape` (Task 3).

> No unit test (entry point); verified by `typecheck:scraper` and the deferred manual smoke run.

- [ ] **Step 1: Implement** — overwrite `scraper/run.ts`:

```ts
import 'dotenv/config'
import { appendFileSync } from 'node:fs'
import { launchBrowser, renderPage } from './render.ts'
import { resolveAdapter } from './adapters/index.ts'
import { scoreJob } from './score.ts'
import { createScraperClient, fetchActiveSources, upsertJobs, recordSourceRun } from './db.ts'
import { runScrape } from './pipeline.ts'
import { buildRunSummaryMarkdown } from './runSummary.ts'

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
      recordSourceRun: (result) => recordSourceRun(client, result),
    })
    const { sources, extracted, inserted, failedSources } = summary
    console.log('[scrape] done', { sources, extracted, inserted, failedSources })

    const summaryFile = process.env.GITHUB_STEP_SUMMARY
    if (summaryFile) {
      appendFileSync(summaryFile, buildRunSummaryMarkdown(summary))
    }
  } finally {
    await browser.close()
  }
}

main().catch((err: unknown) => {
  console.error('[scrape] fatal:', (err as Error).message)
  process.exit(1)
})
```

- [ ] **Step 2: Type-check and commit**

```bash
npm run typecheck:scraper
git add scraper/run.ts
git commit -m "feat: wire recordSourceRun + write run Step Summary (#20, #18)"
```

---

## Task 6: Workflow concurrency guard

**Files:**

- Modify: `.github/workflows/daily-scraper.yml`

- [ ] **Step 1: Add the concurrency guard** — in `.github/workflows/daily-scraper.yml`, replace the `on:` block:

```yaml
on:
  schedule:
    - cron: '0 9 * * *' # 09:00 UTC daily
  workflow_dispatch:
```

with:

```yaml
on:
  schedule:
    - cron: '0 9 * * *' # 09:00 UTC daily (06:00 BRT)
  workflow_dispatch:

concurrency:
  group: daily-scraper
  cancel-in-progress: false
```

- [ ] **Step 2: Validate YAML**

Run: `node -e "const s=require('fs').readFileSync('.github/workflows/daily-scraper.yml','utf8');if(!/concurrency:/.test(s)||!/group: daily-scraper/.test(s))throw new Error('concurrency missing');console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/daily-scraper.yml
git commit -m "ci: prevent overlapping daily-scraper runs with concurrency guard (#18)"
```

---

## Task 7: `ScrapingSource` type + `formatLastRun` helper

**Files:**

- Modify: `src/types/index.ts`
- Create: `src/components/SourceCard/formatLastRun.ts` + `formatLastRun.spec.ts`

**Interfaces:**

- Produces:

  ```ts
  interface LastRunDisplay {
    text: string
    tone: 'muted' | 'ok' | 'error'
    title?: string
  }
  const formatLastRun: (source: ScrapingSource) => LastRunDisplay
  ```

- [ ] **Step 1: Extend `ScrapingSource`** — in `src/types/index.ts`, replace the `ScrapingSource` interface:

```ts
export interface ScrapingSource {
  id: string
  url: string
  label: string
  is_active: boolean
  created_at: string
  last_run_at?: string | null
  last_run_jobs_added?: number | null
  last_run_status?: 'success' | 'error' | null
  last_run_error?: string | null
}
```

- [ ] **Step 2: Write the failing test** — `src/components/SourceCard/formatLastRun.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatLastRun } from './formatLastRun'
import type { ScrapingSource } from '../../types'

const base: ScrapingSource = {
  id: 's1',
  label: 'WWR',
  url: 'https://weworkremotely.com',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
}

describe('formatLastRun', () => {
  it('shows a muted "nunca" when there is no run', () => {
    expect(formatLastRun(base)).toEqual({ text: 'Última run: nunca', tone: 'muted' })
  })

  it('shows a pt-BR date, the job count, and a check on success', () => {
    const r = formatLastRun({
      ...base,
      last_run_at: '2026-06-22T09:00:00Z',
      last_run_status: 'success',
      last_run_jobs_added: 4,
    })
    expect(r.tone).toBe('ok')
    expect(r.text).toMatch(/^Última run: \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} · 4 vagas novas · ✅$/)
  })

  it('uses the singular "1 vaga nova"', () => {
    const r = formatLastRun({
      ...base,
      last_run_at: '2026-06-22T09:00:00Z',
      last_run_status: 'success',
      last_run_jobs_added: 1,
    })
    expect(r.text).toContain('· 1 vaga nova ·')
  })

  it('shows "falhou" with the error in the title on error', () => {
    const r = formatLastRun({
      ...base,
      last_run_at: '2026-06-22T09:00:00Z',
      last_run_status: 'error',
      last_run_error: 'render timeout',
    })
    expect(r.tone).toBe('error')
    expect(r.text).toMatch(/^Última run: \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} · falhou ⚠️$/)
    expect(r.title).toBe('render timeout')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/SourceCard/formatLastRun.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement** — `src/components/SourceCard/formatLastRun.ts`:

```ts
import type { ScrapingSource } from '../../types'

export interface LastRunDisplay {
  text: string
  tone: 'muted' | 'ok' | 'error'
  title?: string
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export const formatLastRun = (source: ScrapingSource): LastRunDisplay => {
  if (!source.last_run_at) {
    return { text: 'Última run: nunca', tone: 'muted' }
  }
  const when = dateFmt.format(new Date(source.last_run_at))
  if (source.last_run_status === 'error') {
    return {
      text: `Última run: ${when} · falhou ⚠️`,
      tone: 'error',
      title: source.last_run_error ?? undefined,
    }
  }
  const n = source.last_run_jobs_added ?? 0
  const count = n === 1 ? '1 vaga nova' : `${n} vagas novas`
  return { text: `Última run: ${when} · ${count} · ✅`, tone: 'ok' }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/SourceCard/formatLastRun.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/components/SourceCard/formatLastRun.ts src/components/SourceCard/formatLastRun.spec.ts
git commit -m "feat: ScrapingSource last_run fields + formatLastRun helper (#20)"
```

---

## Task 8: Render the "Última run" line in `SourceCard`

**Files:**

- Modify: `src/components/SourceCard/SourceCard.tsx`
- Test: `src/components/SourceCard/SourceCard.spec.tsx`

**Interfaces:**

- Consumes: `formatLastRun` (Task 7).

- [ ] **Step 1: Add failing render tests** — append inside the `describe('SourceCard', ...)` block in `src/components/SourceCard/SourceCard.spec.tsx`:

```ts
  it('shows "nunca" when the source has no last run', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Última run: nunca/)).toBeInTheDocument()
  })

  it('shows the jobs-added count on a successful last run', () => {
    const ran = {
      ...source,
      last_run_at: '2026-06-22T09:00:00Z',
      last_run_status: 'success' as const,
      last_run_jobs_added: 4,
    }
    render(<SourceCard source={ran} />, { wrapper: makeWrapper() })
    expect(screen.getByText(/4 vagas novas/)).toBeInTheDocument()
  })

  it('shows "falhou" with the error as a title on a failed last run', () => {
    const failed = {
      ...source,
      last_run_at: '2026-06-22T09:00:00Z',
      last_run_status: 'error' as const,
      last_run_error: 'render timeout',
    }
    render(<SourceCard source={failed} />, { wrapper: makeWrapper() })
    const line = screen.getByText(/falhou/)
    expect(line).toHaveAttribute('title', 'render timeout')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/SourceCard/SourceCard.spec.tsx`
Expected: FAIL — the "Última run" text is not rendered yet.

- [ ] **Step 3: Implement** — in `src/components/SourceCard/SourceCard.tsx`:

Add the import after the existing imports:

```ts
import { formatLastRun } from './formatLastRun'
```

Inside the component, after the existing `const { setEditingSource, setSourceModalOpen } = useUIContext()` line, add:

```ts
const lastRun = formatLastRun(source)
const lastRunClass =
  lastRun.tone === 'error'
    ? 'text-amber-400'
    : lastRun.tone === 'ok'
      ? 'text-gray-400'
      : 'text-gray-600'
```

And add the line directly after the URL `<p>`:

```tsx
      <p className="text-gray-500 text-xs truncate">{source.url}</p>

      <p className={`text-xs ${lastRunClass}`} title={lastRun.title}>
        {lastRun.text}
      </p>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/SourceCard/SourceCard.spec.tsx`
Expected: PASS (existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/components/SourceCard/SourceCard.tsx src/components/SourceCard/SourceCard.spec.tsx
git commit -m "feat: show last-run status on SourceCard (#20)"
```

---

## Task 9: Full verification + close #18

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npm run test:run`
Expected: PASS (all existing + new scraper and SourceCard tests).

- [ ] **Step 2: Coverage threshold (src only)**

Run: `npm run coverage`
Expected: PASS at ≥ 80% lines/functions (`formatLastRun` and the SourceCard line are covered; scraper stays outside the gate by design).

- [ ] **Step 3: Lint, app build, scraper type-check**

Run: `npm run lint && npm run build && npm run typecheck:scraper`
Expected: no lint errors (the pre-existing UIContext warning is unrelated); `tsc -b && vite build` succeeds; scraper type-check clean.

- [ ] **Step 4: Final commit (only if verification needed fixups)**

```bash
git add -A
git commit -m "chore: verification fixups for per-source run observability (#20, #18)"
```

> **Manual step after merge (record):** comment on issue #18 mapping each acceptance criterion to what covers it (workflow structure, cron, secret mapping, graceful per-source failure handling + concurrency guard + Step Summary), then close #18. Apply the Task 1 migration in Supabase before the next run.

---

## Self-Review Notes

- **Spec coverage:** data model → Task 1; `ScrapingSource` type → Task 7; `recordSourceRun` → Task 2; pipeline restructure + `perSource` → Task 3; Step Summary helper → Task 4; run wiring + summary write → Task 5; concurrency guard → Task 6; `formatLastRun` + states → Task 7; SourceCard line → Task 8; testing + #18 close → Task 9.
- **Deviation from spec (intentional):** the spec's "`useEditSource` clobber fix" and its dedicated mutation test are **not** tasks — the code already patches only `{ label, url, is_active }` (`useSourceMutations.ts:30-34`), so there is no clobber to fix and a new mutation spec would be redundant scaffolding. Noted in File Structure.
- **Type consistency:** `SourceRunResult`/`SourceRunStatus` defined in `db.ts` (Task 2), imported by `pipeline.ts` (Task 3) and surfaced via `ScrapeSummary.perSource`; `buildRunSummaryMarkdown` consumes `ScrapeSummary` (Task 4); `formatLastRun`/`LastRunDisplay` defined in Task 7, consumed in Task 8. No circular import (`pipeline` imports types from `db`; `db` imports nothing from `pipeline`).
- **TZ-stable tests:** `formatLastRun` tests assert the date via regex, not an exact time, so they don't depend on the runner timezone.
- **Playwright isolation preserved:** `runSummary.ts` and `pipeline.ts` import no Playwright; only `run.ts`/`render.ts` do.
