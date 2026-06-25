# Scraper: recency window (~2 months) across all sources

**Issue:** #56
**Date:** 2026-06-24
**Related:** #24 (GitHub Issues adapter — first implementation of the rule), #29 (scraper coverage), #27 (pipeline efficiency)

## Problem

Cross-cutting product rule: the scraper should only ingest **jobs published within the last ~60 days**. Older postings are likely already filled and only pollute the inbox, so they must be discarded at ingestion time.

The rule was first implemented in the GitHub Issues adapter (#24): it filters by `created_at` inside the `fetch` step (`filterRecentIssues`, a pure helper with early-stop on the paginated, date-desc API).

This work **extends the same rule to the HTML board adapters** — We Work Remotely, Remotive, RemoteOK, EU Remote Jobs, Working Nomads — and the generic JSON-LD fallback, with a single shared cutoff definition instead of a per-adapter `RECENCY_DAYS`.

## Constraints (from the issue)

- `parse` stays **pure**: no time math, no `new Date()`. Date _extraction_ is fine; the _cutoff comparison_ lives elsewhere.
- The time cutoff lives in the `fetch`/render step or is injected — for HTML boards this means the pipeline.
- Comparing ISO 8601 UTC dates lexicographically is sufficient (`publishedAt >= cutoffIso`).
- One common cutoff point (shared constant/util), not duplicated per adapter.

## Decision: no-date fallback

When a board does **not** expose a reliable publication date, its jobs are **ingested anyway** (only jobs with a date older than the cutoff are dropped). The limitation is documented per-adapter in a code comment. This avoids losing fresh jobs from boards that simply don't publish dates, at the cost of some stale jobs slipping in from those sources.

## Approach

Add an optional date field to `RawJob`; each `parse` extracts the board's publication date when available (extraction only — still pure). The pipeline computes one shared `cutoffIso` per run and drops jobs older than it before scoring and upsert. Date-less jobs pass through.

Rejected alternatives:

- **Inject a `filterRecent` hook per adapter** — spreads the policy across adapters; more moving parts.
- **Pass the cutoff into `parse`** — violates the "keep `parse` pure" constraint.

The chosen approach puts the cutoff in exactly one place (the pipeline) for HTML boards, keeps `parse` pure, and shares a single constant. GitHub keeps its own in-`fetch` filter because pagination needs early-stop, but it sources the constant from the shared module.

## Design

### 1. Shared recency module — `scraper/recency.ts`

```ts
export const RECENCY_DAYS = 60

export const recencyCutoffIso = (now: Date = new Date()): string =>
  new Date(now.getTime() - RECENCY_DAYS * 86_400_000).toISOString()

/** Keep a job when it has no date, or its date >= cutoff (lexicographic ISO compare). */
export const isRecent = (publishedAt: string | null | undefined, cutoffIso: string): boolean =>
  !publishedAt || publishedAt >= cutoffIso
```

`scraper/adapters/github.ts` imports `RECENCY_DAYS` from this module instead of keeping its own local constant. Its `filterRecentIssues` early-stop logic stays as-is (pagination over a date-desc API needs it).

### 2. `RawJob` gains a date field

In `scraper/adapters/types.ts`:

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

Every adapter's `parse` sets `published_at`: a normalized ISO value where the board provides one, `null` otherwise. Malformed/unparseable dates are normalized to `null` (kept), not thrown — `parse` stays pure and total.

### 3. Pipeline applies the cutoff once

In `scraper/pipeline.ts` `runScrape`:

1. Compute `const cutoff = recencyCutoffIso()` once per run.
2. `adapter.parse(content)` → `RawJob[]`.
3. `.filter((r) => isRecent(r.published_at, cutoff))`.
4. Map each kept `RawJob` to `JobRow` **explicitly** (no blind `{ ...raw }` spread) so `published_at` never leaks into the upsert payload, adding `source_url`, `relevance_score`, `relevance_level`.

This is the single enforcement point for HTML boards. The `extracted` count reflects rows _after_ the recency filter.

### 4. DB boundary

`published_at` is an **ingestion-time signal only** — it is **not persisted**. The `jobs` table has no such column, so the explicit `RawJob → JobRow` mapping in step 3.4 deliberately omits it. No `schema.sql` change is needed.

### 5. Per-adapter date extraction

Each `parse` sets `published_at` (normalized ISO 8601 UTC) or `null`. The exact source field/selector must be **verified against live markup during implementation** — the current test fixtures are simplified and lack dates, so each board is verified and its fixture updated to include the date element.

| Adapter           | Expected date source                 | Status                               |
| ----------------- | ------------------------------------ | ------------------------------------ |
| Remotive          | JSON `publication_date`              | Reliable — normalize to ISO UTC      |
| RemoteOK          | JSON `date` (ISO with offset)        | Reliable                             |
| generic (JSON-LD) | `JobPosting.datePosted`              | Reliable when present                |
| We Work Remotely  | listing `<time datetime>` / `data-*` | Verify; `null` if the index has none |
| EU Remote Jobs    | job-card posted date                 | Verify; `null` if none               |
| Working Nomads    | listing date attribute               | Verify; `null` if none               |

Where a board exposes no reliable date, `parse` returns `published_at: null`, the job is ingested anyway, and the limitation is documented in a comment on that adapter.

GitHub: `parseGithubIssues` also sets `published_at` from `created_at` (its rows are already date-filtered in `fetch`, so the pipeline filter is a no-op for them).

## Testing

- `scraper/recency.spec.ts`: `isRecent` (no date → kept; `>=` cutoff → kept; `<` cutoff → dropped) and `recencyCutoffIso` math.
- Each board adapter spec: a recent date is extracted into `published_at`; a date-less fixture yields `published_at: null`.
- `scraper/pipeline.spec.ts`: stale job dropped, recent job kept, date-less job kept; assert `published_at` is absent from the upsert payload.

## Out of scope

- Persisting or displaying a publication date in the UI / `jobs` table.
- Changing GitHub's existing `fetch`-step filter behavior (only the shared constant is reused).
- Adding recency to sources that genuinely expose no date (they are ingested unfiltered by decision above).
