# ATS adapters (Lever / Greenhouse) — design

**Issue:** #25 (follow-up de #17)
**Date:** 2026-06-26

## Problem

`https://jobs.lever.co` and `https://boards.greenhouse.io` are **ATS roots** — they
list no jobs without a company slug (e.g. `jobs.lever.co/<empresa>`,
`boards.greenhouse.io/<empresa>`). As generic-adapter sources they only ever time
out on `waitForSelector`. We want real job extraction from Lever- and
Greenhouse-hosted company boards.

Both ATSes expose **public JSON APIs** per company, so we scrape those instead of
HTML — more robust and the same pattern as the existing GitHub adapter.

## Architecture

Two new API-based adapters following the **GitHub adapter precedent**
(`scraper/adapters/github.ts`): an `Adapter` whose `fetch` derives an API URL from
the source URL path and whose pure `parse` maps JSON → `RawJob[]`. Resolution is by
bare hostname (`resolveAdapter` in `scraper/adapters/index.ts`), so no HTML
rendering and no `readySelector`.

### Source URL model

One `scraping_sources` row per target company:

| Provider   | Source URL                            | Host                   |
| ---------- | ------------------------------------- | ---------------------- |
| Lever      | `https://jobs.lever.co/<slug>`        | `jobs.lever.co`        |
| Greenhouse | `https://boards.greenhouse.io/<slug>` | `boards.greenhouse.io` |

The two hosts are distinct and unambiguous, so `resolveAdapter` matches each to its
adapter with no overlap.

## Components

### `scraper/adapters/lever.ts`

API: `https://api.lever.co/v0/postings/<slug>?mode=json` → array of postings.

Confirmed posting shape (probed against `leverdemo`):

- `text` — job title
- `categories.location` (string) and `categories.allLocations` (string[])
- `workplaceType` — `remote` | `hybrid` | `on-site`
- `createdAt` — epoch milliseconds
- `hostedUrl` — canonical job URL
- `descriptionPlain` — plain-text description
- **No company name field.**

Because postings carry no company name, `fetch` wraps the response so `parse` stays
pure (no URL/slug access inside `parse`):

```
fetch(url, ctx):
  slug = last non-empty path segment of url
  { status, body } = httpGet("https://api.lever.co/v0/postings/<slug>?mode=json")
  if status >= 400: throw
  return JSON.stringify({ company: slug, postings: JSON.parse(body) })
```

`parse(content)`:

- Parse the `{ company, postings }` wrapper (return `[]` on malformed JSON or
  non-array `postings`).
- **Remote-only filter:** keep a posting when `workplaceType === 'remote'` **or** its
  `categories.location` / any `categories.allLocations` entry matches `/remote/i`.
- Map each kept posting → `RawJob`:
  - `title` = `text` (trimmed; skip if empty)
  - `company` = wrapper `company` (the slug)
  - `url` = `hostedUrl` (trimmed; skip if empty)
  - `location` = `categories.location ?? null`
  - `description` = `descriptionPlain ?? null`
  - `published_at` = `createdAt` (epoch ms) → ISO 8601 UTC, or `null` if absent

### `scraper/adapters/greenhouse.ts`

API: `https://boards-api.greenhouse.io/v1/boards/<slug>/jobs?content=true` →
`{ jobs: [...] }`.

Confirmed job shape (probed against `stripe`):

- `title`
- `absolute_url`
- `location.name` (string)
- `first_published` (ISO 8601) and `updated_at` (ISO 8601)
- `content` — HTML, HTML-entity-escaped (e.g. `&lt;p&gt;`)
- `company_name` — present per job

`fetch(url, ctx)`: derive `<slug>` from path, GET the jobs endpoint, throw on
status >= 400, return body as-is.

`parse(content)`:

- Parse `{ jobs }` (return `[]` on malformed JSON or missing/non-array `jobs`).
- **Remote-only filter:** keep a job when `location.name` matches `/remote/i`.
- Map each kept job → `RawJob`:
  - `title` = `title` (trimmed; skip if empty)
  - `company` = `company_name` (trimmed; skip if empty)
  - `url` = `absolute_url` (trimmed; skip if empty)
  - `location` = `location.name ?? null`
  - `description` = unescaped HTML entities from `content`, truncated to a max
    length (reuse the GitHub adapter's `DESCRIPTION_MAX = 5000`), or `null`
  - `published_at` = `first_published` (fallback `updated_at`) → ISO, or `null`

Both adapters are registered in `scraper/adapters/index.ts`.

### Recency

No pipeline change. `runScrape` already filters via
`isRecent(raw.published_at, cutoff)`, so emitting `published_at` is sufficient for
the ~2-month recency window.

## Data / migration

`supabase/migrations/0004_seed_ats_company_sources.sql`:

1. Disable the two generic roots (idempotent, matching the `0003` pattern):
   ```sql
   update scraping_sources set is_active = false
   where url in ('https://jobs.lever.co', 'https://boards.greenhouse.io');
   ```
2. Insert a small curated set of real per-company ATS rows with
   `on conflict (url) do nothing` (idempotent), `is_active = true`, labels like
   `"Stripe (Greenhouse)"`. The exact slug set is curated during implementation
   from companies known to use each ATS; the acceptance bar is **at least one real
   company per provider that returns jobs**.

## Docs

Update `docs/scraper-sources.md`:

- Remove the #25 carve-out from the "Out of scope" note.
- Add an **"Adding an ATS company target"** section: pick Lever or Greenhouse, find
  the company's slug from its public careers URL (`jobs.lever.co/<slug>` /
  `boards.greenhouse.io/<slug>`), insert one `scraping_sources` row
  (`url`, `label`, `is_active = true`). No code change needed — the adapter resolves
  by host.

## Error handling

- Unknown/empty slug or malformed API JSON → `parse` returns `[]` (no throw); the
  pipeline records the source run as success with 0 jobs.
- API status >= 400 → `fetch` throws; the pipeline catches it, records the source
  run as `error`, and continues with other sources (existing behavior).

## Testing

Vitest unit tests per adapter, mirroring `scraper/adapters/github.spec.ts`:

- `parse` over fixture JSON strings: remote-only filtering (drop hybrid/on-site/
  non-remote-location), field mapping, epoch-ms → ISO (Lever),
  `first_published`/`updated_at` selection and HTML-entity unescaping (Greenhouse),
  description truncation, and skipping rows missing title/company/url.
- Malformed JSON and empty/missing-array input → `[]`.
- `fetch` with a stubbed `httpGet`: asserts the derived API URL, throw-on-4xx, and
  (Lever) the `{ company, postings }` wrapping.

## Out of scope (YAGNI)

- Auto-deriving ATS slugs from the `companies` wishlist or adding ATS columns to
  `companies` — manual seed rows + docs only.
- Location/Brazil filtering beyond the remote-only adapter filter; keyword scoring
  already ranks relevance downstream.
