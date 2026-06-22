# Per-Source Run Observability — Design

**Issues:** [#20](https://github.com/marcelotust/remote-radar/issues/20) (last-run data in SourceCard) + [#18](https://github.com/marcelotust/remote-radar/issues/18) (daily workflow hardening)
**Date:** 2026-06-22
**Status:** Approved (brainstorming)

## Objective

Record, per scraping source, the outcome of the most recent scraper run
(when, how many new jobs, success/error) and surface it on each `SourceCard`,
so a user can tell at a glance whether a source is healthy and productive
without opening logs. Plus small hardening of the daily workflow (#18).

## Decisions (from brainstorming)

1. **Data model:** four columns on `scraping_sources` (`last_run_at`,
   `last_run_jobs_added`, `last_run_status`, `last_run_error`) — not a separate
   history table. "Last run only" is enough; YAGNI.
2. **Pipeline:** restructure from one batched upsert to **per-source**
   processing so each source's "jobs added" can be counted and recorded.
3. **#18:** incremental hardening only (the workflow from #17 already meets the
   acceptance criteria) — concurrency guard + GitHub Step Summary; then close.

## Architecture

### Pipeline restructure (shared core)

Today `runScrape` collects all jobs from all sources and upserts once at the
end, so it cannot attribute "jobs added" to a source. Change to per-source:

```
for each active source:
  try:
    html  = renderPage(url, adapter.readySelector)
    rows  = adapter.parse(html).map(score + source_url)
    added = (await upsertJobs(rows)).count        // new rows for THIS source
    result = { url, status: 'success', jobsAdded: added, error: null }
  catch err:
    result = { url, status: 'error', jobsAdded: 0, error: truncate(msg, 300) }
  await recordSourceRun(result)                    // writes last_run_* by url
  results.push(result)
```

`runScrape` returns the existing `ScrapeSummary` plus `perSource:
SourceRunResult[]`. `inserted` becomes the sum of per-source `jobsAdded`;
`failedSources` the count of `error` results. This is N upserts instead of 1
— negligible for ~46 sources and required for per-source attribution.

`recordSourceRun` is injected via `PipelineDeps` (like the other deps) so the
pipeline stays unit-testable without a DB or browser.

### New/changed types

```ts
// scraper/pipeline.ts
export type SourceRunStatus = 'success' | 'error'
export interface SourceRunResult {
  url: string
  status: SourceRunStatus
  jobsAdded: number
  error: string | null
}
export interface ScrapeSummary {
  sources: number
  extracted: number
  inserted: number
  failedSources: number
  perSource: SourceRunResult[] // added
}
```

`PipelineDeps` gains:

```ts
recordSourceRun: (result: SourceRunResult) => Promise<void>
```

### Data layer (`scraper/db.ts`)

New function, injected into the pipeline via `run.ts`:

```ts
recordSourceRun(client, result): updates scraping_sources
  set last_run_at = now(), last_run_jobs_added = result.jobsAdded,
      last_run_status = result.status, last_run_error = result.error
  where url = result.url
```

Uses the service-role client (bypasses RLS). `now()` is computed in JS
(`new Date().toISOString()`) so the function stays deterministic/testable.
The error string is already truncated to ≤300 chars by the pipeline; it never
contains the service-role key (Playwright/Supabase error messages don't).

## Database

`supabase/migrations/0002_source_last_run.sql` (and mirror in `schema.sql`):

```sql
alter table scraping_sources add column if not exists last_run_at        timestamptz;
alter table scraping_sources add column if not exists last_run_jobs_added int;
alter table scraping_sources add column if not exists last_run_status     text
  check (last_run_status in ('success', 'error'));
alter table scraping_sources add column if not exists last_run_error      text;
```

No RLS change: the scraper writes with the service-role key; the browser keeps
anon read (existing `sources_anon_read`).

### App-side data flow

- `ScrapingSource` (`src/types/index.ts`) gains four optional fields:
  `last_run_at?: string | null`, `last_run_jobs_added?: number | null`,
  `last_run_status?: 'success' | 'error' | null`, `last_run_error?: string | null`.
- `useSources` selects `*`, so the new columns flow through automatically
  (verify it isn't column-restricted; widen if needed).
- **`useEditSource` clobbering guard:** today it does `update({ ...source })`,
  which would overwrite the scraper-written `last_run_*` with whatever the
  browser last read (a read-edit race). Change the edit mutation to send only
  the user-editable fields `{ label, url, is_active }`. `AddSourceModal`'s edit
  path is unaffected (it only sets those fields).

## UI — SourceCard (#20)

Add a "Última run" line below the URL. Formatting lives in a **pure exported
helper** (testable without rendering), not inline JSX:

```ts
// formatLastRun(source): { text: string; tone: 'muted' | 'ok' | 'error'; title?: string }
```

States:

- No run (`last_run_at == null`) → `Última run: nunca` (muted/gray).
- Success → `Última run: 22/06/2026 06:00 · 4 vagas novas · ✅`
  - "N vagas novas" with `jobsAdded` (handle 0 → "0 vagas novas"; singular
    "1 vaga nova").
- Error → `Última run: 22/06/2026 06:00 · falhou ⚠️`, with the element's
  `title` attribute set to `last_run_error` (hover shows the message).

Date/time formatted pt-BR via `Intl.DateTimeFormat('pt-BR', { dateStyle:
'short', timeStyle: 'short' })`. The card stays under the ESLint 250-line /
one-component-per-file limits; `formatLastRun` may live in the same file as a
named export or a sibling `SourceCard.utils.ts` (plan decides).

## Workflow hardening (#18)

`.github/workflows/daily-scraper.yml`:

- **Concurrency guard** so scheduled + manual runs don't overlap:
  ```yaml
  concurrency:
    group: daily-scraper
    cancel-in-progress: false
  ```
- **GitHub Step Summary:** `run.ts`, after `runScrape`, if
  `process.env.GITHUB_STEP_SUMMARY` is set, appends a markdown summary
  (totals + a per-source table: source · status · jobs added). The markdown is
  produced by a **pure exported helper** (`buildRunSummaryMarkdown(summary)`)
  for testability; `run.ts` just writes it to the file. Absent the env var
  (local runs) nothing is written.
- **Cron** stays `0 9 * * *` (09:00 UTC = 06:00 BRT, matching the issue's
  "06:00" intent). Secrets unchanged.
- After merge: comment on #18 mapping each acceptance criterion to what covers
  it, and close it.

## Error handling

- Per-source `try/catch` already isolates failures; now each failure is also
  persisted (`last_run_status = 'error'`, truncated `last_run_error`) so the
  card can show it. One source failing never aborts the run.
- `recordSourceRun` failures (e.g. transient DB error writing metadata) must
  not abort the whole run: wrap each `recordSourceRun` call so a metadata-write
  error logs a warning and continues. The job rows were already upserted.
- Service-role key never logged; error strings truncated to ≤300 chars.

## Testing (Vitest)

- **`pipeline.spec.ts`:** per-source results for success-with-N,
  success-with-0, and an isolated error; `recordSourceRun` called once per
  source with the right shape; `inserted` = sum of `jobsAdded`; a thrown
  `recordSourceRun` doesn't abort the run.
- **`db.spec.ts`:** `recordSourceRun` issues `update(...).eq('url', ...)` with
  `last_run_at`/`last_run_jobs_added`/`last_run_status`/`last_run_error`.
- **`runSummary.spec.ts`:** `buildRunSummaryMarkdown` renders totals + the
  per-source table (incl. an error row).
- **`SourceCard.spec.tsx`:** the three `formatLastRun` states (never / success
  with pt-BR datetime + count / error with `title`); existing SourceCard tests
  still pass.
- **`useSourceMutations` test:** edit sends only `{ label, url, is_active }`
  (no `last_run_*`).
- Update the in-memory Supabase fake / `mockData` only as needed for the new
  columns (nullable defaults; the fake already supports `update().eq()`).

## Out of scope

- A `scraping_runs` history table / charts (future; "last run only" now).
- Retry/notification/alerting on workflow failure (issue #18 hardening kept
  minimal per the brainstorming decision).
- Real-time UI updates — the card reflects the last fetched value; a page
  refresh shows the latest run (consistent with the rest of the app).
- Changing which sources are active or fixing the 45 failing sources (tracked
  in #29 and children).

## Implementation order

schema migration → `ScrapingSource` type → `recordSourceRun` (db) →
`buildRunSummaryMarkdown` helper → pipeline restructure (per-source +
`recordSourceRun`) → `run.ts` (wire `recordSourceRun`, write Step Summary) →
workflow hardening → `useEditSource` clobber fix → `SourceCard` +
`formatLastRun` → full verification. Close #18 with a coverage comment.
