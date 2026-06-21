# Remote Radar — MVP Design Spec

**Date:** 2026-06-20  
**Status:** Approved  
**Project directory:** `/Users/marcelotust/Projetos/remote-radar`

---

## 1. Overview

Remote Radar is a personal web application (dark-mode SPA) that serves as the front-end dashboard for a daily remote job scraping routine. The scraper runs externally via GitHub Actions and writes directly to Supabase. The frontend displays job listings, highlights the most relevant ones via a keyword scoring system, flags companies from the user's wishlist, and enables quick networking via dynamically generated Google Dork URLs.

---

## 2. Tech Stack

| Concern      | Choice                                                 |
| ------------ | ------------------------------------------------------ |
| Build tool   | Vite                                                   |
| Framework    | React 18 (functional components, arrow functions only) |
| Language     | TypeScript (strict mode)                               |
| Styling      | Tailwind CSS (dark mode by default)                    |
| Routing      | React Router DOM                                       |
| Server state | TanStack Query (React Query v5)                        |
| UI state     | React Context API                                      |
| Backend/BaaS | Supabase (PostgREST + Realtime)                        |
| Testing      | Vitest + React Testing Library                         |
| Linting      | ESLint + Prettier                                      |
| Deployment   | Vercel                                                 |

---

## 3. Linter & Formatter Rules

- **ESLint** with `eslint-plugin-react`, `@typescript-eslint`, `eslint-plugin-react-hooks`
- `react/no-multi-comp` — strictly one React component per file
- `max-lines` — set to 250 lines per file
- **Prettier** for formatting (single quotes, no semicolons optional — team/user preference)
- ESLint and Prettier run as pre-commit hooks via `lint-staged` + `husky`

---

## 4. Database Schema (Supabase / PostgreSQL)

### `jobs` (written by scraper, status updated by frontend)

```sql
CREATE TABLE jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  company     TEXT NOT NULL,
  url         TEXT NOT NULL UNIQUE,
  location    TEXT,
  description TEXT,
  posted_at   TIMESTAMPTZ,
  scraped_at  TIMESTAMPTZ DEFAULT NOW(),
  status      TEXT DEFAULT 'unseen'
              CHECK (status IN ('unseen', 'seen', 'applied', 'dismissed')),
  source_url  TEXT
);
```

### `companies` (wishlist — managed by frontend)

```sql
CREATE TABLE companies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  website        TEXT,
  notes          TEXT,
  remote_brazil  TEXT DEFAULT 'unknown'
                 CHECK (remote_brazil IN ('unknown', 'yes', 'no')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

`remote_brazil` tracks whether the company is confirmed to hire remote workers from Brazil. Filled in manually by the user over time:

- `unknown` → gray badge "Não confirmado"
- `yes` → green badge "Remote Brasil ✓"
- `no` → red badge "Não contrata remoto"

### `scraping_sources` (job board URLs — managed by frontend)

```sql
CREATE TABLE scraping_sources (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url        TEXT NOT NULL UNIQUE,
  label      TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. TypeScript Types (`src/types/index.ts`)

```typescript
export type JobStatus = 'unseen' | 'seen' | 'applied' | 'dismissed'
export type RemoteBrazilStatus = 'unknown' | 'yes' | 'no'
export type RelevanceLevel = 'high' | 'medium' | 'low' | 'negative'

export interface Job {
  id: string
  title: string
  company: string
  url: string
  location: string | null
  description: string | null
  posted_at: string | null
  scraped_at: string
  status: JobStatus
  source_url: string | null
  // computed at render time from keyword config — not stored in DB
  relevance_score?: number
  relevance_level?: RelevanceLevel
  // joined from companies table at render time
  is_wishlist_company?: boolean
  wishlist_remote_brazil?: RemoteBrazilStatus
}

export interface Company {
  id: string
  name: string
  website: string | null
  notes: string | null
  remote_brazil: RemoteBrazilStatus
  created_at: string
}

export interface ScrapingSource {
  id: string
  url: string
  label: string
  is_active: boolean
  created_at: string
}

export interface KeywordConfig {
  positive: string[]
  negative: string[]
}
```

---

## 6. Folder Structure

```
remote-radar/
├── public/
├── src/
│   ├── components/
│   │   ├── JobCard/
│   │   │   ├── JobCard.tsx
│   │   │   └── JobCard.spec.tsx
│   │   ├── ScoreBadge/
│   │   │   ├── ScoreBadge.tsx
│   │   │   └── ScoreBadge.spec.tsx
│   │   ├── StatusDropdown/
│   │   │   ├── StatusDropdown.tsx
│   │   │   └── StatusDropdown.spec.tsx
│   │   ├── NetworkingButton/
│   │   │   ├── NetworkingButton.tsx
│   │   │   └── NetworkingButton.spec.tsx
│   │   ├── RemoteBrazilBadge/
│   │   │   ├── RemoteBrazilBadge.tsx
│   │   │   └── RemoteBrazilBadge.spec.tsx
│   │   ├── CompanyCard/
│   │   │   ├── CompanyCard.tsx
│   │   │   └── CompanyCard.spec.tsx
│   │   ├── SourceCard/
│   │   │   ├── SourceCard.tsx
│   │   │   └── SourceCard.spec.tsx
│   │   ├── AddCompanyModal/
│   │   │   ├── AddCompanyModal.tsx
│   │   │   └── AddCompanyModal.spec.tsx
│   │   ├── AddSourceModal/
│   │   │   ├── AddSourceModal.tsx
│   │   │   └── AddSourceModal.spec.tsx
│   │   ├── NavBar/
│   │   │   ├── NavBar.tsx
│   │   │   └── NavBar.spec.tsx
│   │   └── FilterBar/
│   │       ├── FilterBar.tsx
│   │       └── FilterBar.spec.tsx
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── DashboardPage.spec.tsx
│   │   ├── WishlistPage.tsx
│   │   └── WishlistPage.spec.tsx
│   ├── hooks/
│   │   ├── useJobs.ts
│   │   ├── useUpdateJobStatus.ts
│   │   ├── useCompanies.ts
│   │   ├── useCompanyMutations.ts
│   │   ├── useSources.ts
│   │   ├── useSourceMutations.ts
│   │   └── useNetworkingDork.ts
│   ├── contexts/
│   │   └── UIContext.tsx
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── scoring.ts
│   │   ├── scoring.spec.ts
│   │   ├── dorkUrl.ts
│   │   ├── dorkUrl.spec.ts
│   │   └── keywords.ts
│   └── data/
│       └── mockData.ts
├── docs/
│   └── superpowers/specs/
├── .eslintrc.cjs
├── .prettierrc
├── vite.config.ts
├── vitest.config.ts
└── tailwind.config.ts
```

Test files are co-located with the components they test. A separate `/src/tests` directory is reserved for future E2E tests (Playwright/Cypress), which are out of MVP scope.

---

## 7. Routes

| Path        | Page            | Description                       |
| ----------- | --------------- | --------------------------------- |
| `/`         | `DashboardPage` | Daily job feed with filters       |
| `/wishlist` | `WishlistPage`  | Companies + Scraping Sources CRUD |

---

## 8. Pages

### DashboardPage (`/`)

Full-height dark layout.

- Top: `NavBar` + `FilterBar`
- Body: scrollable list of `JobCard` components
- Sort order: `relevance_score` descending, then `scraped_at` descending

**FilterBar controls:**

- Status: All / Unseen / Applied / Dismissed
- Relevance: All / High / Medium / Low
- Toggle: Wishlist companies only

### WishlistPage (`/wishlist`)

Two-panel layout (stacked on mobile, side-by-side on desktop ≥ lg breakpoint):

- **Left panel:** `CompanyCard` list + "Add Company" button → `AddCompanyModal`
- **Right panel:** `SourceCard` list + "Add Source" button → `AddSourceModal`

---

## 9. Component Inventory

| Component           | Responsibility                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NavBar`            | Logo + navigation links (Dashboard, Wishlist)                                                                                                           |
| `FilterBar`         | Filter/sort controls for the job feed                                                                                                                   |
| `JobCard`           | Job listing: title, company, location, score badge, remote Brazil badge (if wishlist company), status dropdown, networking button, link to original URL |
| `ScoreBadge`        | Color-coded pill — High (green) / Medium (yellow) / Low (gray) / Negative (red)                                                                         |
| `RemoteBrazilBadge` | Pill for wishlist companies — "Remote Brasil ✓" (green) / "Não confirmado" (gray) / "Não contrata remoto" (red). Hidden for non-wishlist companies.     |
| `StatusDropdown`    | Select: unseen / seen / applied / dismissed                                                                                                             |
| `NetworkingButton`  | Icon button that builds and opens a Google Dork URL in a new tab                                                                                        |
| `CompanyCard`       | Company name, website, notes, `RemoteBrazilBadge`, inline `remote_brazil` toggle, edit/delete actions                                                   |
| `SourceCard`        | Source label + URL, active/inactive toggle, delete action                                                                                               |
| `AddCompanyModal`   | Form: name (required), website, notes, `remote_brazil` selector                                                                                         |
| `AddSourceModal`    | Form: label (required), URL (required)                                                                                                                  |

---

## 10. Hooks

| Hook                             | Responsibility                                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `useJobs()`                      | TanStack Query — fetches jobs, enriches with `relevance_score`, `relevance_level`, `is_wishlist_company`, `wishlist_remote_brazil` |
| `useUpdateJobStatus()`           | TanStack Query mutation with optimistic update                                                                                     |
| `useCompanies()`                 | TanStack Query — fetches companies list                                                                                            |
| `useCompanyMutations()`          | add / edit / delete company, invalidates cache                                                                                     |
| `useSources()`                   | TanStack Query — fetches scraping sources                                                                                          |
| `useSourceMutations()`           | add / edit / delete source, invalidates cache                                                                                      |
| `useNetworkingDork(companyName)` | Pure hook — returns encoded Google Dork URL string                                                                                 |

In MVP phase, query hooks return data from `src/data/mockData.ts`. Hook signatures are identical to post-Supabase hooks — no component changes needed when wiring the real backend.

---

## 11. Utils

### `src/utils/keywords.ts`

Hardcoded keyword configuration. Edit this file to tune scoring without a redeploy requirement. Example:

```typescript
export const KEYWORD_CONFIG: KeywordConfig = {
  positive: ['react', 'frontend', 'typescript', 'remote', 'next.js', 'vue', 'tailwind'],
  negative: ['java', 'presencial', 'on-site', 'php', 'cobol', '.net', 'pleno obrigatório'],
}
```

### `src/utils/scoring.ts`

Pure function, no side effects.

```typescript
export const computeRelevanceScore = (
  job: Pick<Job, 'title' | 'description'>,
  config: KeywordConfig
): { score: number; level: RelevanceLevel } => { ... }
```

Score = (positive keyword matches × +1) + (negative keyword matches × −1).  
Levels: score ≥ 3 → `high`, 1–2 → `medium`, 0 → `low`, < 0 → `negative`.

### `src/utils/dorkUrl.ts`

Pure function.

```typescript
export const buildDorkUrl = (companyName: string): string =>
  `https://www.google.com/search?q=${encodeURIComponent(
    `site:linkedin.com/in "${companyName}" ("Frontend" OR "Software Engineer" OR "Tech Recruiter") "Brasil"`
  )}`
```

---

## 12. Testing Strategy

### Coverage

Vitest coverage threshold: **80% lines and functions**. CI fails below this threshold.

### What gets tested in MVP

| Target                          | Tests                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| Every component                 | Renders without crashing, key props visible in DOM, user interactions fire handlers |
| `scoring.ts`                    | Positive match, negative match, mixed, zero keywords, empty description             |
| `dorkUrl.ts`                    | Correct URL format, proper encoding, special characters in company name             |
| `DashboardPage`, `WishlistPage` | Smoke test: route renders, key sections visible                                     |

### What is out of scope for MVP

- Supabase integration tests
- E2E flows (Playwright/Cypress)

---

## 13. Context

### `UIContext`

Holds UI-only state:

- `activeFilters: FilterState` — current filter selections on the Dashboard
- `companyModalOpen: boolean` — controls `AddCompanyModal` visibility
- `sourceModalOpen: boolean` — controls `AddSourceModal` visibility
- `editingCompany: Company | null` — company being edited (null = add mode)
- `editingSource: ScrapingSource | null` — source being edited (null = add mode)

---

## 14. MVP Boundary

**In scope:**

- Project scaffold (Vite + React + TS + Tailwind + Router)
- ESLint + Prettier + strict rules
- Vitest + RTL setup with 80% coverage gate
- All components and pages with mock data
- Scoring engine and Dork URL utility

**Out of scope (next phase):**

- Supabase client integration
- Authentication
- GitHub Actions scraper
- Pagination / infinite scroll
- Real-time updates via Supabase Realtime
- E2E tests
