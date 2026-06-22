# Headless Scraping Engine — Design

**Issue:** [#17](https://github.com/marcelotust/remote-radar/issues/17) — Implement Headless Scraping Engine using Node.js and Playwright
**Date:** 2026-06-21
**Status:** Approved (brainstorming)

## Objective

A standalone Node.js + Playwright script that extracts job listings from the
URLs in the `scraping_sources` table, scores them with the project's keyword
rules, and upserts them into Supabase without creating duplicates. Plus an
in-app button that triggers the scraper through GitHub Actions.

## Decisions (from brainstorming)

1. **Run model:** standalone TypeScript script executed by GitHub Actions
   (daily cron + `workflow_dispatch`). No new always-on backend.
2. **Extraction:** per-source adapter registry (one module per board) with a
   generic fallback — not a single generic extractor.
3. **Scoring storage:** add `relevance_score` / `relevance_level` columns to
   `jobs`; the scraper writes them. The app prefers stored values and falls
   back to client-side compute for un-scored rows.
4. **Trigger button:** opens the GitHub Actions workflow page in a new tab — no
   GitHub token in the browser, no new server infra.
5. **Scoring improvement:** switch the shared scorer from naive substring
   matching to word-boundary matching (fixes `java` matching inside
   `javascript`, etc.). Applies to the whole app, not just the scraper.

## Architecture

The scraper lives in a new `scraper/` directory at the repo root, written in
TypeScript and run via `tsx` (`npm run scrape`). The guiding principle:
**Playwright only renders the page; extraction is a pure function of HTML.**
This keeps every adapter unit-testable against saved fixtures with no live
browser in CI.

```
scraper/
  run.ts            # entry/orchestrator
  render.ts         # Playwright: navigate, wait for dynamic DOM, return HTML
  db.ts             # Supabase service-role client + fetchActiveSources / upsertJobs
  score.ts          # thin wrapper over shared computeRelevanceScore
  adapters/
    types.ts        # Adapter interface + RawJob type
    index.ts        # resolveAdapter(url) by host, generic fallback
    <board>.ts      # one adapter per supported board
    generic.ts      # JSON-LD / heuristic fallback adapter
```

### Module responsibilities

- **`render.ts`** — `renderPage(browser, url, readySelector): Promise<string>`.
  Opens a page, navigates, `waitForSelector(readySelector, { timeout })` to let
  dynamic content load, returns `page.content()` (the rendered HTML string),
  and closes the page. This is the only module that touches Playwright.
- **`adapters/types.ts`** — defines:
  ```ts
  interface RawJob {
    title: string
    company: string
    url: string
    location: string | null
    description: string | null
  }
  interface Adapter {
    host: string // e.g. 'weworkremotely.com'
    readySelector: string // selector to wait for before grabbing HTML
    parse(html: string): RawJob[] // pure; uses jsdom (existing dev dep)
  }
  ```
- **`adapters/index.ts`** — `resolveAdapter(sourceUrl): Adapter`, matching by
  URL host; returns the `generic` adapter when no specific one is registered.
- **`adapters/<board>.ts`** — site-specific selectors + a pure `parse(html)`
  built on `jsdom`. Initial scope: **1–2 real, dynamically-rendered boards**
  (satisfies the AC), structured so more drop in later.
- **`adapters/generic.ts`** — best-effort fallback: parse `JSON-LD`
  `JobPosting` structured data when present, else return `[]`.
- **`score.ts`** — `scoreJob(raw): { relevance_score, relevance_level }` by
  delegating to the existing `computeRelevanceScore` + `KEYWORD_CONFIG` from
  `src/utils/`. **No keyword logic is duplicated.**
- **`db.ts`** — creates a Supabase client from `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY` (service role bypasses RLS).
  - `fetchActiveSources(): ScrapingSource[]` — `is_active = true` rows.
  - `upsertJobs(jobs): { inserted, skipped }` — `upsert(..., { onConflict:
'url', ignoreDuplicates: true })` so existing URLs are left untouched.
- **`run.ts`** — orchestrates the flow and owns logging + error isolation.

### Data flow

```
fetchActiveSources()
  └─ for each source (isolated try/catch):
       resolveAdapter(url)
       → renderPage(browser, url, adapter.readySelector)   # Playwright
       → adapter.parse(html)                                # pure
       → map: scoreJob(raw) → row { ...raw, source_url, relevance_* }
  collect all rows
  → upsertJobs(rows)            # dedupe by url
  → log summary { perSource: fetched, total new, skipped }
```

## Scoring

### Current behavior (`src/utils/scoring.ts`)

`score = (# positive keywords matched) − (# negative keywords matched)` over
`title + " " + description`, lowercased, each keyword counted at most once.
Levels: `≥3 high`, `1–2 medium`, `0 low`, `<0 negative`. Keywords live in
`src/utils/keywords.ts`.

### Improvement: word-boundary matching

Replace `text.includes(keyword)` with a boundary-aware regex test so a keyword
only matches when it is not part of a larger alphanumeric token. Use
lookarounds (not `\b`, which breaks on keywords containing `.`, `#`, `-`):

```ts
const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i')
re.test(text)
```

Effects:

- `java` no longer matches inside `javascript` ✅ (the motivating bug).
- Special-char keywords still work: `c#`, `.net`, `next.js`, `front-end`.
- **Known trade-off:** compound tokens like `reactjs`/`nodejs` stop matching
  the bare `react`/`node` keywords. To avoid regressing common true positives,
  add `reactjs` and `vuejs` to the positive list. (`nextjs` already exists.)

This is a shared change: `scoring.ts` is imported by both `useJobs` and the new
`scraper/score.ts`, so the app and the scraper stay consistent.
`src/utils/scoring.spec.ts` is updated to cover boundary cases.

## Database

No migrations directory exists yet; create `supabase/migrations/` and also keep
`schema.sql` current for fresh installs.

`supabase/migrations/0001_relevance_columns.sql`:

```sql
alter table jobs add column if not exists relevance_score int;
alter table jobs add column if not exists relevance_level text
  check (relevance_level in ('high', 'medium', 'low', 'negative'));
```

The same two columns are added to `jobs` in `schema.sql`.

No new RLS policy is required: the scraper uses the **service-role key**, which
bypasses RLS. The browser continues to use the anon key (read + update only).

### App change (`useJobs`)

Today `useJobs` always overwrites `relevance_score`/`relevance_level` with a
client-side compute. Change it to **prefer the stored DB value when present**
(`job.relevance_score != null`), and compute only as a fallback. The
`relevance_score`-descending sort and wishlist enrichment are unchanged. The
`Job` type already declares both fields as optional — no type change needed.

## Trigger button

A `RunScraperButton` component placed on the Wishlist page near the scraping
sources list. It is an anchor/button that opens the GitHub Actions workflow
page in a new tab (`target="_blank"`, `rel="noopener noreferrer"`), where the
user clicks "Run workflow". The URL comes from `VITE_GITHUB_WORKFLOW_URL`
(added to `.env.example`); if unset, the button is hidden. No GitHub token is
ever exposed to the browser.

## GitHub Actions workflow (minimal)

`.github/workflows/daily-scraper.yml` is included here as the dispatch target
so the button has something to trigger:

- Triggers: `schedule` (daily cron, e.g. `0 9 * * *`) + `workflow_dispatch`.
- Steps: checkout → setup Node (`cache: npm`) → `npm ci` → cache the Playwright
  browser binaries via `actions/cache` (key on the Playwright version) →
  `npx playwright install --with-deps chromium` (a no-op on a cache hit) →
  `npm run scrape`.
- **Cost control:** caching the Chromium download keeps each run to ~1–2 min, so
  a daily run uses well under 100 of the 2,000 free private-repo Actions
  minutes/month.
- Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` mapped from GitHub
  Secrets to env.

Full CI hardening — credential-leak guards, timeout/failure handling, log
hygiene — is **out of scope here and owned by issue #18**. This file is the
minimal, working version; #18 refines it. The overlap will be noted on #18.

## Error handling

- Per-source `try/catch` in `run.ts`: one failing/timing-out board logs a
  warning and is skipped; the run continues and still upserts what succeeded.
- `waitForSelector` uses a bounded timeout so a board that never renders the
  target element fails fast rather than hanging.
- The service-role key is never logged. Errors log the source URL and message
  only.
- The script exits non-zero only on a total failure (e.g. cannot reach
  Supabase); partial success exits zero.

## Environment & tooling

- `.env.example` gains: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `VITE_GITHUB_WORKFLOW_URL`.
- New devDependencies: `playwright`, `tsx`, `dotenv`.
- New script: `"scrape": "tsx scraper/run.ts"`.
- `scraper/` is type-checked by the existing `tsc` build config (extend
  `include` if needed). The scraper imports directly from `src/utils/` so
  keyword/scoring logic has a single source of truth.

## Testing (Vitest)

- **Adapters:** `adapters/<board>.spec.ts` — `parse(fixtureHtml)` against
  saved HTML fixtures → expected `RawJob[]`. No live browser.
- **Scoring:** extend `scoring.spec.ts` for boundary cases (`java` vs
  `javascript`, `c#`, `.net`, `reactjs`).
- **`upsertJobs`:** drive the existing in-memory Supabase fake; assert
  dedupe-by-url (existing URLs untouched).
- **`run` orchestration:** mock `render` + `db`; assert per-source error
  isolation (one throwing source doesn't abort the run) and that scored rows
  reach `upsertJobs`.
- **`RunScraperButton`:** RTL — renders with the configured URL, hidden when
  the env var is absent, opens in a new tab.
- **`useJobs`:** stored score is preferred; compute is the fallback for rows
  with null score.

## Out of scope

- Full CI/CD hardening (issue #18).
- Adapters for every seeded source (incremental; start with 1–2).
- In-app one-click dispatch via a serverless proxy (explicitly deferred).
- Storing per-keyword match details or richer scoring models.
