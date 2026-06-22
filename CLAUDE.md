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

Remote Radar is a job-tracking SPA for Brazilian remote developers. Data is persisted in **Supabase**; TanStack Query is the client-side state/cache layer. The Supabase client lives in `src/lib/supabase.ts` and reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `.env.example`). The DB schema + RLS policies live in `supabase/schema.sql`.

### Provider stack (`App.tsx`)

```
QueryClientProvider → UIProvider → BrowserRouter
```

- `QueryClientProvider`: wraps everything; React Query is the client-side state layer over Supabase.
- `UIProvider` (`src/contexts/UIContext.tsx`): global UI state — filter state (`FilterState`), modal open/close flags, and which entity is being edited (`editingCompany`, `editingSource`).

### Routes

| Path        | Page                                                   |
| ----------- | ------------------------------------------------------ |
| `/`         | `DashboardPage` — filtered job list                    |
| `/wishlist` | `WishlistPage` — wishlist companies + scraping sources |

### Data flow

All data is read from / written to Supabase inside the hooks — components and pages never touch Supabase directly:

- `useJobs` → selects from the `jobs` table, then enriches raw jobs with `relevance_score`/`relevance_level` (via `computeRelevanceScore`) and `is_wishlist_company`/`wishlist_remote_brazil` (by joining against `useCompanies` results via a memoised `wishlistMap`) in React Query's `select`.
- `useCompanies`, `useSources` → thin wrappers around `useQuery` selecting `companies` / `scraping_sources`.
- Mutation hooks (`useCompanyMutations`, `useSourceMutations`, `useUpdateJobStatus`, `useToggleJobRead`) call Supabase insert/update/delete, then sync the query cache. `useUpdateJobStatus` and `useToggleJobRead` use optimistic updates with rollback on error and `onSettled: invalidateQueries` to re-sync.

`src/data/mockData.ts` is **test-only seed data**: it backs the in-memory Supabase fake (`src/lib/__mocks__/supabase.ts`) which is wired up globally in `src/test-setup.ts` (`vi.mock('./lib/supabase')` + per-test reset).

### Scoring & keywords

`src/utils/scoring.ts` — `computeRelevanceScore` scans job title + description for positive/negative keywords defined in `src/utils/keywords.ts`. Score = positive matches − negative matches; thresholds map to `RelevanceLevel` (`high ≥ 3`, `medium ≥ 1`, `low = 0`, `negative < 0`).

### Networking dork

`src/utils/dorkUrl.ts` builds a Google search URL targeting LinkedIn profiles at a given company in Brazil. Used by `NetworkingButton` via `useNetworkingDork`.

### Key types (`src/types/index.ts`)

- `Job` — core entity; `status` (`none | applied | dismissed`, user action), `read` boolean (read/unread, independent of status), optional enriched fields set by `useJobs`.
- `Company` — wishlist entry with `remote_brazil: 'unknown' | 'yes' | 'no'`.
- `ScrapingSource` — URL + label for future scraper targets.
- `FilterState` — `{ status, relevance, wishlistOnly, unreadOnly }` held in `UIContext`.

### Testing conventions

Tests use Vitest + React Testing Library + `@testing-library/jest-dom`. Components that depend on React Query must be wrapped in a `QueryClientProvider` with a fresh client per test. `UIProvider` is added where `useUIContext` is needed. Files follow the co-location pattern: `Component/Component.spec.tsx` next to `Component/Component.tsx`.
