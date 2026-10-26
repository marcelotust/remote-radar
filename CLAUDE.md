# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server
npm run build        # type-check + build
npm run test         # vitest in watch mode
npm run test:run     # vitest single run
npm run coverage     # run tests with coverage (80% line/function threshold)
npm run lint         # ESLint
npm run format       # Prettier
```

Run a single test file:

```bash
npx vitest run src/hooks/useJobs.spec.tsx
```

## Architecture

Remote Radar is a job-tracking SPA for Brazilian remote developers, used by a small group of invited friends (not a single-tenant tool). Data is persisted in **Supabase**; TanStack Query is the client-side state/cache layer. The Supabase client lives in `src/lib/supabase.ts` and reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `.env.example`). The DB schema + RLS policies live in `supabase/schema.sql`; incremental deltas for an already-provisioned database live in `supabase/migrations/`.

### Auth

`LoginPage` only offers Google OAuth (`signInWithOAuth`) — the email/magic-link form (`signInWithOtp`) was removed from the UI because, without custom SMTP configured on the Supabase project, the built-in email service **only delivers to addresses that are members of the project's team**, so magic link silently failed to reach anyone else (see the issue tracking custom SMTP setup). The `is_email_allowed` RPC and `signInWithOtp` mock still exist in `src/lib/__mocks__/supabase.ts` and `supabase/schema.sql` since the allowlist hook and RPC are shared infrastructure, not dead code — only the client-side magic-link entry point was removed. There's no self-serve admin UI — adding a friend means inserting their email into `allowed_users` directly in the Supabase SQL editor. `AuthProvider`/`useAuth` (`src/contexts/AuthContext.tsx`) track the session; `RequireAuth` (`src/components/RequireAuth/RequireAuth.tsx`) guards every route except `/login`, redirecting signed-out visitors there.

Allowlist enforcement for Google sign-in happens at the database level: the Postgres function `hook_restrict_signup_to_allowlist`, wired up as Supabase's `before-user-created` Auth Hook (dashboard-only setting, not in code), calls `is_email_allowed` and rejects account creation outright for a non-approved email — this has to happen server-side because the OAuth redirect only returns _after_ Supabase would create the user, so there's no chance to check first client-side. A rejection comes back to `LoginPage` as `error_description` in the URL hash/query, which it reads on mount and clears with `history.replaceState`.

### Provider stack (`App.tsx`)

```
AuthProvider → QueryClientProvider → UIProvider → BrowserRouter
```

- `AuthProvider`: session state; gates the rest of the app via `RequireAuth`.
- `QueryClientProvider`: React Query is the client-side state layer over Supabase.
- `UIProvider` (`src/contexts/UIContext.tsx`): global UI state — filter state (`FilterState`), modal open/close flags, and which source is being edited (`editingSource`).

### Routes

| Path                | Page                                            |
| ------------------- | ----------------------------------------------- |
| `/login`            | `LoginPage` — public, Google sign-in            |
| `/`                 | `HomePage` — dashboard summary                  |
| `/inbox`            | `InboxPage` — filtered, paginated job feed      |
| `/scraping-sources` | `ScrapingSourcesPage` — manage scraping sources |
| `/settings`         | `SettingsPage` — per-user scoring config        |

Every route except `/login` sits behind `RequireAuth`.

### Data flow

All data is read from / written to Supabase inside the hooks — components and pages never touch Supabase directly:

- `useJobs` → pages through the shared `jobs` table newest-first with `.range()` in `FEED_PAGE_SIZE` chunks (PostgREST caps every response at 1,000 rows; an unpaged `select('*')` froze the feed in Sep 2026). The feed only holds jobs that are both _recent_ (`listed_at` within `FEED_WINDOW_DAYS` = 60, where `listed_at` is the generated `coalesce(posted_at, scraped_at)`) and _open_ (`last_seen_at` within `FEED_CLOSED_AFTER_DAYS` = 3: the scraper re-stamps it each run for every job its source still lists, so a job that disappears from the source leaves the feed). Jobs the user applied to are always loaded, however old or closed. Merges `status`/`read` from the user's `job_user_state` rows (default `'none'`/`false` when there's no row yet), then enriches with `relevance_score`/`relevance_level` (via `computeRelevanceScore` + the resolved `useScoringConfig`) in React Query's `select`, ranking by publication day (UTC, `listedAt` in `utils/jobDates.ts`) and then relevance. "New" means published in the last `NEW_JOB_DAYS` (7), not first scraped: the inbox has a "Novas (7 dias)" filter and the home card counts the same.
- `useSources` → thin wrapper around `useQuery` selecting `scraping_sources` (shared, everyone sees every source).
- Mutation hooks call Supabase insert/update/delete/upsert, then sync the query cache:
  - `useUpdateJobStatus` / `useToggleJobRead` **upsert into `job_user_state`** (`onConflict: 'user_id,job_id'`) — status/read are per user, not columns on `jobs` itself (`jobs.status`/`jobs.read` are vestigial, kept only until `supabase/migrations/0010_drop_job_status_columns.sql` is applied). Both use optimistic updates with rollback on error and `onSettled: invalidateQueries` to re-sync.
  - `useSourceMutations` → `useAddSource` stamps `created_by`/`created_by_email` from the current session; sources are shared and readable by everyone, but only the creator (or nobody, for legacy rows with `created_by = null`) can edit/delete a given one — enforced by RLS, mirrored in the UI by `SourceCard` hiding Editar/Excluir for non-owners.
  - `useScoringConfigMutations` → `useReplaceScoringKeywords`/`useUpdateScoringSettings` only ever write the current user's own `scoring_keywords`/`scoring_settings` rows; the first save from Settings is what forks a personal config off the global default (see below).

`src/data/mockData.ts` is **test-only seed data**: it backs the in-memory Supabase fake (`src/lib/__mocks__/supabase.ts`) which is wired up globally in `src/test-setup.ts` (`vi.mock('./lib/supabase')` + per-test reset). The fake also simulates `supabase.auth` (session, `signInWithOtp`, `signOut`) and `supabase.rpc('is_email_allowed', …)`; tests can drive the fake session with the exported `__setSupabaseSession` helper.

### Scoring & keywords (per user)

`src/utils/scoring.ts` — `computeRelevanceScore` matches weighted keywords (`scoring_keywords`) against job title + description, and hard vetoes against title + location only (a passing mention like "our backend is Java" in the description must not sink a role); any veto match forces `relevance_level: 'negative'`, otherwise the summed weight maps to `RelevanceLevel` via the thresholds in `scoring_settings` (`high`/`medium`/`low`/`negative`). `useScoringConfig` resolves, per signed-in user: **their own** `scoring_keywords`/`scoring_settings` rows if any exist, else the **global** (`user_id is null`) defaults, else the hardcoded `DEFAULT_SCORING_CONFIG` in `src/utils/keywords.ts`. Writes (`useReplaceScoringKeywords`, `useUpdateScoringSettings`) only ever touch the caller's own rows — the global default is read-only from the app.

### Scraper (`scraper/`)

Runs daily from `.github/workflows/daily-scraper.yml` (`npm run scrape`, with the service-role key). `run.ts` → `runScrape` in `pipeline.ts`: for each active `scraping_sources` row, `adapters/index.ts` picks an adapter by host. API/feed adapters (`ashby`, `greenhouse`, `lever`, `github`, `remoteok`, `weworkremotely`) define `fetch` and use plain HTTP; the rest render with Playwright (`render.ts`), falling back to `generic` (JSON-LD). Parsed jobs pass two shared filters before the upsert: `recency.ts` (60 days) and `roleFilter.ts` (software-development titles only — the pool is shared, so per-person targeting belongs downstream of it). `upsertJobs` (`db.ts`) merges on `url`: new rows are inserted with the source's `posted_at`, and every job still listed gets `last_seen_at` refreshed (and its content updated); the run's `jobsAdded` counts only the new ones. A run that extracts nothing or loses most of its sources exits non-zero so the workflow fails visibly (`runHealthProblem` in `runSummary.ts`). For a board that blocks headless Chromium, look for an RSS feed or public API before writing it off (`docs/scraper-sources.md`).

### Networking dork

`src/utils/dorkUrl.ts` builds a Google search URL targeting LinkedIn profiles at a given company in Brazil. Used by `NetworkingButton` via `useNetworkingDork`. Unrelated to auth/per-user state — it only takes the employer name off a `Job`.

### Key types (`src/types/index.ts`)

- `Job` — core entity, shared across all users; `status` (`none | applied | dismissed`) and `read` are populated per-user by `useJobs` from `job_user_state`, not stored on `Job` itself in the DB.
- `JobUserState` — `{ user_id, job_id, status, read }`, one row per (user, job) pair.
- `ScrapingSource` — shared; `created_by`/`created_by_email` record who added it. `company_type` (`'startup' | 'consultoria' | 'produto' | 'agregador' | null`, #109) tags the source's profile — null means unclassified, set from the "Adicionar Fonte"/"Editar Fonte" form and shown as a badge on `SourceCard`.
- `ScoringKeyword` / `ScoringSettings` — `user_id: string | null`; `null` is the global default, a real id is that user's personal override.
- `FilterState` — `{ status, relevance, unreadOnly }` held in `UIContext`.

### Testing conventions

Tests use Vitest + React Testing Library + `@testing-library/jest-dom`. Components that depend on React Query must be wrapped in a `QueryClientProvider` with a fresh client per test. Anything that calls `useAuth()` (directly, or transitively via `useJobs`/`useScoringConfig`/source mutations) must be wrapped in `AuthProvider` too, or the hook throws; use `__setSupabaseSession(...)` from `src/lib/__mocks__/supabase.ts` to simulate a signed-in user before rendering. When a mutation hook that reads `useAuth()` is exercised right after a query hook in the same test, render both from a **single** `renderHook(() => ({ ... }))` call sharing one tree — a second, separate `renderHook()` mounts its own `AuthProvider` that hasn't resolved the session yet, and calling `mutate()` immediately against it fails. `UIProvider` is added where `useUIContext` is needed. The Supabase fake applies `eq`/`is`/`in`/`gte`/`range` and caps every select at 1,000 rows like PostgREST (`order` is accepted but not applied), and derives the `jobs` columns Postgres fills in (`last_seen_at` defaults to now, `listed_at` follows `posted_at`/`scraped_at`), so a job a test inserts must carry a recent `scraped_at` (e.g. `new Date().toISOString()`) to land in `useJobs`' window — the seeded `MOCK_JOBS` are stamped relative to the run for that reason. Files follow the co-location pattern: `Component/Component.spec.tsx` next to `Component/Component.tsx`.
