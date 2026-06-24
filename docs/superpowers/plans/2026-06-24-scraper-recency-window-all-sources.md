# Scraper Recency Window Across All Sources — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the ~60-day recency cutoff to every scraper source (HTML boards + JSON-LD fallback), not just GitHub Issues, from a single shared cutoff definition.

**Architecture:** A shared `scraper/recency.ts` owns `RECENCY_DAYS`, the cutoff timestamp, and the keep/drop predicate. Each adapter's pure `parse` extracts a normalized `published_at` (ISO 8601 UTC) or `null`. The pipeline computes one cutoff per run and filters parsed jobs before scoring/upsert. `published_at` is an ingestion-time signal only — never persisted.

**Tech Stack:** TypeScript (Node ESM, `.ts` import specifiers), Vitest, jsdom.

## Global Constraints

- `parse` stays **pure**: no `new Date()`, no cutoff comparison inside `parse`. Extraction only.
- Compare ISO 8601 UTC dates lexicographically (`publishedAt >= cutoffIso`).
- One shared cutoff definition (`scraper/recency.ts`); no per-adapter `RECENCY_DAYS`.
- No-date fallback: jobs with `published_at: null` are **ingested anyway** (kept).
- `published_at` is **not persisted** — it must never reach the `upsertJobs` payload.
- Import specifiers include the `.ts` extension, matching existing scraper files.
- Run tests with `npx vitest run <path>` (single run, not watch).

---

## File Structure

- **Create** `scraper/recency.ts` — shared `RECENCY_DAYS`, `recencyCutoffIso`, `isRecent`.
- **Create** `scraper/recency.spec.ts` — unit tests for the above.
- **Modify** `scraper/adapters/dom.ts` — add pure `dateTime` helper (extract `<time datetime>` → ISO UTC).
- **Modify** `scraper/adapters/dom.spec.ts` — tests for `dateTime`.
- **Modify** `scraper/adapters/types.ts` — add `published_at: string | null` to `RawJob`.
- **Modify** every adapter to set `published_at`: `github.ts`, `remotive.ts`, `remoteok.ts`, `generic.ts`, `weworkremotely.ts`, `euremotejobs.ts`, `workingnomads.ts`.
- **Modify** their fixtures + specs to exercise date extraction.
- **Modify** `scraper/pipeline.ts` — compute cutoff once, filter by `isRecent`, map to `JobRow` explicitly (drop `published_at`).
- **Modify** `scraper/pipeline.spec.ts` — add `published_at` to test helpers; add recency cases.

---

### Task 1: Shared recency module

**Files:**

- Create: `scraper/recency.ts`
- Test: `scraper/recency.spec.ts`
- Modify: `scraper/adapters/github.ts:64-65,103` (import `RECENCY_DAYS`, delete local const)

**Interfaces:**

- Produces:
  - `RECENCY_DAYS: number` (= 60)
  - `recencyCutoffIso(now?: Date): string` — ISO timestamp `RECENCY_DAYS` days before `now`
  - `isRecent(publishedAt: string | null | undefined, cutoffIso: string): boolean` — `true` when no date or `publishedAt >= cutoffIso`

- [ ] **Step 1: Write the failing test**

Create `scraper/recency.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { RECENCY_DAYS, recencyCutoffIso, isRecent } from './recency.ts'

describe('recencyCutoffIso', () => {
  it('returns an ISO timestamp RECENCY_DAYS before now', () => {
    const now = new Date('2026-06-24T00:00:00.000Z')
    expect(recencyCutoffIso(now)).toBe('2026-04-25T00:00:00.000Z')
  })

  it('defaults to the current time', () => {
    expect(typeof recencyCutoffIso()).toBe('string')
  })

  it('uses a 60-day window', () => {
    expect(RECENCY_DAYS).toBe(60)
  })
})

describe('isRecent', () => {
  const cutoff = '2026-04-25T00:00:00.000Z'

  it('keeps a job dated on/after the cutoff', () => {
    expect(isRecent('2026-06-01T00:00:00.000Z', cutoff)).toBe(true)
    expect(isRecent(cutoff, cutoff)).toBe(true)
  })

  it('drops a job dated before the cutoff', () => {
    expect(isRecent('2026-01-01T00:00:00.000Z', cutoff)).toBe(false)
  })

  it('keeps a job with no date (null or undefined)', () => {
    expect(isRecent(null, cutoff)).toBe(true)
    expect(isRecent(undefined, cutoff)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scraper/recency.spec.ts`
Expected: FAIL — cannot find module `./recency.ts`.

- [ ] **Step 3: Create the module**

Create `scraper/recency.ts`:

```ts
export const RECENCY_DAYS = 60

export const recencyCutoffIso = (now: Date = new Date()): string =>
  new Date(now.getTime() - RECENCY_DAYS * 86_400_000).toISOString()

/** Keep a job when it has no date, or its date >= cutoff (lexicographic ISO compare). */
export const isRecent = (publishedAt: string | null | undefined, cutoffIso: string): boolean =>
  !publishedAt || publishedAt >= cutoffIso
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scraper/recency.spec.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Refactor github.ts to use the shared constant**

In `scraper/adapters/github.ts`, add to the imports at the top:

```ts
import { RECENCY_DAYS } from '../recency.ts'
```

Delete the local declaration (currently around line 65):

```ts
const RECENCY_DAYS = 60
```

Leave `const PER_PAGE = 100` and everything else unchanged. (`fetchGithubIssues` still computes its own cutoff inline for the paginated early-stop — that stays.)

- [ ] **Step 6: Verify github tests still pass**

Run: `npx vitest run scraper/adapters/github.spec.ts`
Expected: PASS (unchanged behavior; constant now imported).

- [ ] **Step 7: Commit**

```bash
git add scraper/recency.ts scraper/recency.spec.ts scraper/adapters/github.ts
git commit -m "feat(scraper): shared recency module; github reuses RECENCY_DAYS (#56)"
```

---

### Task 2: Pure `dateTime` DOM helper

**Files:**

- Modify: `scraper/adapters/dom.ts`
- Test: `scraper/adapters/dom.spec.ts`

**Interfaces:**

- Consumes: jsdom `Element`.
- Produces: `dateTime(root: Element | null): string | null` — finds the first descendant `time[datetime]`, parses its `datetime` attribute, returns it normalized to ISO 8601 UTC, or `null` when absent/empty/unparseable.

- [ ] **Step 1: Write the failing test**

Add to `scraper/adapters/dom.spec.ts` (create the file if it only has `text` tests — append a new `describe`). Import `dateTime` alongside the existing `text` import:

```ts
import { JSDOM } from 'jsdom'
import { dateTime } from './dom.ts'

const el = (html: string): Element => new JSDOM(html).window.document.body.firstElementChild!

describe('dateTime', () => {
  it('extracts and normalizes a descendant <time datetime> to ISO UTC', () => {
    expect(dateTime(el('<a><time datetime="2026-06-01T12:00:00+02:00"></time></a>'))).toBe(
      '2026-06-01T10:00:00.000Z'
    )
  })

  it('returns null when there is no time element', () => {
    expect(dateTime(el('<a><span>no date</span></a>'))).toBeNull()
  })

  it('returns null for an empty or unparseable datetime', () => {
    expect(dateTime(el('<a><time datetime=""></time></a>'))).toBeNull()
    expect(dateTime(el('<a><time datetime="3 days ago"></time></a>'))).toBeNull()
  })

  it('returns null for a null root', () => {
    expect(dateTime(null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scraper/adapters/dom.spec.ts`
Expected: FAIL — `dateTime` is not exported.

- [ ] **Step 3: Implement the helper**

Append to `scraper/adapters/dom.ts`:

```ts
/** ISO 8601 UTC date from a descendant `<time datetime>`, or null when absent/unparseable. */
export const dateTime = (root: Element | null): string | null => {
  const raw = root?.querySelector('time[datetime]')?.getAttribute('datetime')?.trim()
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scraper/adapters/dom.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/adapters/dom.ts scraper/adapters/dom.spec.ts
git commit -m "feat(scraper): dateTime DOM helper for <time datetime> extraction (#56)"
```

---

### Task 3: Thread `published_at` through `RawJob` and every adapter

This is the cross-cutting type change. Adding a required field to `RawJob` forces every adapter and every `RawJob` literal to set it, so this task lands atomically and leaves the build green. Work adapter-by-adapter; the final compile + full suite confirms nothing was missed.

**Files:**

- Modify: `scraper/adapters/types.ts`
- Modify: `scraper/adapters/github.ts`, `remotive.ts`, `remoteok.ts`, `generic.ts`, `weworkremotely.ts`, `euremotejobs.ts`, `workingnomads.ts`
- Modify fixtures: `__fixtures__/github-issues.json`, `remotive.html`, `remoteok.html`, `jsonld.html`, `weworkremotely.html`, `euremotejobs.html`, `workingnomads.html`
- Modify specs: `github.spec.ts`, `remotive.spec.ts`, `remoteok.spec.ts`, `generic.spec.ts`, `weworkremotely.spec.ts`, `euremotejobs.spec.ts`, `workingnomads.spec.ts`, and the helper in `pipeline.spec.ts`

**Interfaces:**

- Consumes: `dateTime` from `./dom.ts` (Task 2).
- Produces: `RawJob.published_at: string | null` set by every adapter — real ISO UTC where the source exposes a date, `null` otherwise.

- [ ] **Step 1: Add the field to the type**

In `scraper/adapters/types.ts`, extend `RawJob`:

```ts
export interface RawJob {
  title: string
  company: string
  url: string
  location: string | null
  description: string | null
  published_at: string | null // ISO 8601 UTC, or null when the board exposes none
}
```

- [ ] **Step 2: Confirm the build now fails to compile**

Run: `npx vitest run scraper/adapters`
Expected: FAIL — every adapter's `RawJob` literal is missing `published_at`. This confirms the type is enforcing coverage. Fix each adapter in the following steps.

- [ ] **Step 3: GitHub — published_at from `created_at`**

In `scraper/adapters/github.ts`, add `created_at` to the `GithubIssue` interface:

```ts
interface GithubIssue {
  title?: string
  html_url?: string
  body?: string | null
  pull_request?: unknown
  created_at?: string
}
```

In `parseGithubIssues`, set the field on the pushed job (its rows are already date-filtered in `fetch`, so this just records the date):

```ts
jobs.push({
  title,
  company,
  url,
  location: 'Remoto',
  description: body ? body.slice(0, DESCRIPTION_MAX) : null,
  published_at: item.created_at ? new Date(item.created_at).toISOString() : null,
})
```

Update fixture `scraper/adapters/__fixtures__/github-issues.json`: add `"created_at": "2026-06-20T00:00:00Z"` to the **first** issue object (the one that becomes `jobs[0]`). Leave the others without `created_at` to exercise the null path.

Update `github.spec.ts` — the `parseGithubIssues` "maps issues to RawJob" assertion for `jobs[0]` must include the new field:

```ts
expect(jobs[0]).toEqual({
  title: 'Product Owner',
  company: 'BotCity',
  url: 'https://github.com/frontendbr/vagas/issues/8511',
  location: 'Remoto',
  description: 'Vaga de PO totalmente remota.',
  published_at: '2026-06-20T00:00:00.000Z',
})
```

Add an assertion for the null case:

```ts
it('sets published_at to null when an issue has no created_at', () => {
  const jobs = parseGithubIssues(json)
  expect(jobs[1].published_at).toBeNull()
})
```

- [ ] **Step 4: Remotive — published_at from `publication_date`**

In `scraper/adapters/remotive.ts`, add `publication_date?: string` to the `RemotiveJob` interface, and set the field on the pushed job:

```ts
jobs.push({
  title,
  company,
  url,
  location: j.candidate_required_location?.trim() || null,
  description: j.description?.trim() || null,
  published_at: j.publication_date ? new Date(j.publication_date).toISOString() : null,
})
```

Update fixture `__fixtures__/remotive.html`: add `"publication_date":"2026-06-15T10:00:00"` to the **first** job in the JSON inside `<pre>`. Leave the second job without it.

Add to `remotive.spec.ts`:

```ts
it('extracts publication_date as published_at, null when absent', () => {
  const jobs = parseRemotive(html)
  expect(jobs[0].published_at).toBe('2026-06-15T10:00:00.000Z')
  expect(jobs[1].published_at).toBeNull()
})
```

(`html` here is the fixture string already loaded in that spec — match the existing variable name in the file.)

- [ ] **Step 5: RemoteOK — published_at from `date`**

In `scraper/adapters/remoteok.ts`, add `date?: string` to `RemoteOkJob`, and set:

```ts
jobs.push({
  title,
  company,
  url,
  location: item.location?.trim() || null,
  description: item.description?.trim() || null,
  published_at: item.date ? new Date(item.date).toISOString() : null,
})
```

Update fixture `__fixtures__/remoteok.html`: add `"date":"2026-06-10T08:30:00-04:00"` to the **first** real job object. Leave the second without it.

Add to `remoteok.spec.ts`:

```ts
it('extracts date as published_at, null when absent', () => {
  const jobs = parseRemoteOk(html)
  expect(jobs[0].published_at).toBe('2026-06-10T12:30:00.000Z')
  expect(jobs[1].published_at).toBeNull()
})
```

(Use the fixture variable name already present in that spec.)

- [ ] **Step 6: Generic JSON-LD — published_at from `datePosted`**

In `scraper/adapters/generic.ts`, set the field in the `parseJsonLd` push:

```ts
const datePosted = asString(p['datePosted'])
jobs.push({
  title,
  company,
  url,
  location: locationOf(p),
  description: asString(p['description']),
  published_at: datePosted ? new Date(datePosted).toISOString() : null,
})
```

Guard the `new Date` against an unparseable value to keep `parse` total — replace the line with:

```ts
const datePosted = asString(p['datePosted'])
const parsedDate = datePosted ? new Date(datePosted) : null
const published_at =
  parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null
jobs.push({
  title,
  company,
  url,
  location: locationOf(p),
  description: asString(p['description']),
  published_at,
})
```

Update fixture `__fixtures__/jsonld.html`: add `"datePosted": "2026-06-12"` to one `JobPosting` block.

Add to `generic.spec.ts`:

```ts
it('extracts datePosted as published_at, null when absent', () => {
  const jobs = parseJsonLd(html)
  expect(jobs.some((j) => j.published_at === '2026-06-12T00:00:00.000Z')).toBe(true)
})
```

(Use the fixture variable name already present in that spec.)

- [ ] **Step 7: HTML board adapters — published_at via `dateTime`**

For each of `weworkremotely.ts`, `euremotejobs.ts`, `workingnomads.ts`: import `dateTime` and set it from the anchor element being iterated (`a`).

In `weworkremotely.ts` change the import line to:

```ts
import { text, dateTime } from './dom.ts'
```

and add to the pushed job:

```ts
      published_at: dateTime(a),
```

Repeat the identical two changes in `euremotejobs.ts` and `workingnomads.ts` (each already iterates an anchor named `a`).

Update each fixture so **one** listing anchor contains a `<time datetime="2026-06-18T00:00:00Z"></time>` child and the others do not, exercising both the real-date and null paths. For example, in `__fixtures__/weworkremotely.html` add inside the first `<a>...</a>`:

```html
<time datetime="2026-06-18T00:00:00Z"></time>
```

Do the same (a `<time datetime>` inside the first job anchor) in `euremotejobs.html` and `workingnomads.html`.

Add a matching assertion to each of `weworkremotely.spec.ts`, `euremotejobs.spec.ts`, `workingnomads.spec.ts` (use the fixture/parse names already in each file):

```ts
it('extracts <time datetime> as published_at, null when absent', () => {
  const jobs = parseWeWorkRemotely(html) // use the spec's existing parse fn + fixture var
  expect(jobs[0].published_at).toBe('2026-06-18T00:00:00.000Z')
  expect(jobs[1].published_at).toBeNull()
})
```

Add a one-line comment above each HTML adapter's `published_at: dateTime(a)` documenting the limitation, e.g.:

```ts
      // Boards without a machine-readable <time datetime> yield null → ingested anyway (#56).
      published_at: dateTime(a),
```

- [ ] **Step 8: Fix the pipeline test helper literals**

In `scraper/pipeline.spec.ts`, the `adapter()` helper and the inline `fetchAdapter` parse mock build `RawJob` literals. Add `published_at: null` to each so they satisfy the type.

In the `adapter` helper's mapped object:

```ts
  parse: () =>
    jobs.map((j) => ({
      title: j.title,
      company: 'C',
      url: j.url,
      location: null,
      description: null,
      published_at: null,
    })),
```

In the `fetchAdapter` test's `parse` mock:

```ts
const parse = vi.fn(() => [
  {
    title: 'Dev',
    company: 'C',
    url: 'https://x/1',
    location: 'Remoto',
    description: null,
    published_at: null,
  },
])
```

(The existing `upsertJobs` assertion in the first test stays unchanged — the pipeline strips `published_at`, so the payload still has no such key. Confirmed by Task 4.)

- [ ] **Step 9: Run the full adapter + pipeline suite to verify a green build**

Run: `npx vitest run scraper`
Expected: PASS — all adapter specs (with new `published_at` assertions), github, dom, recency, and pipeline specs compile and pass.

- [ ] **Step 10: Commit**

```bash
git add scraper/adapters scraper/pipeline.spec.ts
git commit -m "feat(scraper): extract published_at in every adapter (#56)"
```

---

### Task 4: Apply the recency cutoff in the pipeline

**Files:**

- Modify: `scraper/pipeline.ts:1,44-47`
- Test: `scraper/pipeline.spec.ts`

**Interfaces:**

- Consumes: `recencyCutoffIso`, `isRecent` from `../recency.ts`; `RawJob.published_at` from Task 3.
- Produces: `runScrape` drops jobs older than the cutoff before scoring/upsert; `published_at` never appears in the `upsertJobs` payload.

- [ ] **Step 1: Write the failing tests**

Add to `scraper/pipeline.spec.ts`. First add a helper that builds an adapter whose jobs carry explicit `published_at` values (place it near the existing `adapter` helper):

```ts
import type { RawJob } from './adapters/types.ts'

const datedAdapter = (jobs: RawJob[]): Adapter => ({
  host: 'x',
  readySelector: 'body',
  parse: () => jobs,
})

const job = (over: Partial<RawJob>): RawJob => ({
  title: 'Dev',
  company: 'C',
  url: 'https://a.com/1',
  location: null,
  description: null,
  published_at: null,
  ...over,
})
```

Then the cases:

```ts
describe('runScrape recency window', () => {
  const recent = new Date().toISOString()

  it('drops jobs older than the cutoff but keeps recent and date-less jobs', async () => {
    const upsertJobs = vi.fn(async (rows) => ({ count: rows.length }))
    const resolveAdapter = () =>
      datedAdapter([
        job({ url: 'https://a.com/recent', published_at: recent }),
        job({ url: 'https://a.com/old', published_at: '2000-01-01T00:00:00.000Z' }),
        job({ url: 'https://a.com/undated', published_at: null }),
      ])
    const summary = await runScrape(baseDeps({ resolveAdapter, upsertJobs }))

    expect(summary.extracted).toBe(2)
    const upserted = upsertJobs.mock.calls[0][0] as { url: string }[]
    expect(upserted.map((r) => r.url)).toEqual(['https://a.com/recent', 'https://a.com/undated'])
  })

  it('never includes published_at in the upsert payload', async () => {
    const upsertJobs = vi.fn(async (rows) => ({ count: rows.length }))
    const resolveAdapter = () =>
      datedAdapter([job({ url: 'https://a.com/recent', published_at: recent })])
    await runScrape(baseDeps({ resolveAdapter, upsertJobs }))

    const upserted = upsertJobs.mock.calls[0][0] as Record<string, unknown>[]
    expect(upserted[0]).not.toHaveProperty('published_at')
    expect(upserted[0]).toMatchObject({
      title: 'Dev',
      company: 'C',
      url: 'https://a.com/recent',
      location: null,
      description: null,
      source_url: 'https://a.com',
      relevance_score: 2,
      relevance_level: 'medium',
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scraper/pipeline.spec.ts`
Expected: FAIL — the old job is still upserted (`extracted` is 3, not 2) and/or `published_at` is present in the payload, because the pipeline does not yet filter or strip it.

- [ ] **Step 3: Implement the filter + explicit mapping**

In `scraper/pipeline.ts`, add the import at the top:

```ts
import { recencyCutoffIso, isRecent } from './recency.ts'
```

Compute the cutoff once, immediately after `const sources = await deps.fetchActiveSources()`:

```ts
const cutoff = recencyCutoffIso()
```

Replace the current mapping block (the `const rows: JobRow[] = adapter.parse(content).map(...)`) with a filtered, explicit mapping:

```ts
const rows: JobRow[] = adapter
  .parse(content)
  .filter((raw) => isRecent(raw.published_at, cutoff))
  .map((raw) => {
    const { relevance_score, relevance_level } = deps.scoreJob(raw)
    return {
      title: raw.title,
      company: raw.company,
      url: raw.url,
      location: raw.location,
      description: raw.description,
      source_url: source.url,
      relevance_score,
      relevance_level,
    }
  })
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scraper/pipeline.spec.ts`
Expected: PASS — including the pre-existing `runScrape` tests (the date-less helper jobs are kept, so `extracted`/`inserted` counts are unchanged).

- [ ] **Step 5: Run the full scraper suite + type-check**

Run: `npx vitest run scraper`
Expected: PASS.

Run: `npm run build`
Expected: type-check + build succeed with no errors.

- [ ] **Step 6: Commit**

```bash
git add scraper/pipeline.ts scraper/pipeline.spec.ts
git commit -m "feat(scraper): apply recency cutoff in pipeline for all sources (#56)"
```

---

## Self-Review

**Spec coverage:**

- Shared cutoff constant/util → Task 1 (`recency.ts`).
- `parse` stays pure, extraction only → Tasks 2–3 (`dateTime` + per-adapter extraction; no time math in `parse`).
- Cutoff in pipeline (render-step consumer) → Task 4.
- Per-adapter date sources (Remotive/RemoteOK/JSON-LD reliable; WWR/EU/Working Nomads via `<time datetime>`, null otherwise) → Task 3 steps 4–7.
- No-date fallback "ingest anyway" → `isRecent(null) === true` (Task 1) + documented in HTML adapter comments (Task 3 step 7).
- `published_at` not persisted → Task 4 explicit mapping + dedicated test.
- GitHub reuses the shared constant, keeps its own fetch-step filter → Task 1 step 5.

**Placeholder scan:** No TBD/TODO. The "use the spec's existing parse fn + fixture var" notes refer to concrete, already-existing identifiers in each spec file (e.g. `parseRemotive`, `parseRemoteOk`) — the implementer reads the one import line at the top of the file they are editing.

**Type consistency:** `published_at: string | null` in `RawJob`; `isRecent(publishedAt: string | null | undefined, cutoffIso)`; `recencyCutoffIso(now?: Date)`; `dateTime(root: Element | null)` — names match across Tasks 1–4. `JobRow` (unchanged) deliberately has no `published_at`.
