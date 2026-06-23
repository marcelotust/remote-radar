# Feed Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four feed improvements on `DashboardPage` — order by `scraped_at`, hide dismissed jobs by default, paginate 50/page, and show a relative "added" date per card.

**Architecture:** Logic moves into pure, unit-tested units — the `enrichJobs` comparator (`useJobs.ts`), `applyFilters` (extracted to `dashboardFilters.ts`), `relativeDate` and `paginate` (`src/utils`). `DashboardPage` is the only stateful composition point: it owns the page number and composes `useJobs → applyFilters → paginate`. No schema/type/data-layer change — `scraped_at` and `status` already exist on `Job`.

**Tech Stack:** React 19, TanStack Query, TypeScript, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-23-feed-improvements-design.md`

## Global Constraints

- **No schema/type/data change** — use existing `Job.scraped_at` and `Job.status`. No new Supabase columns or queries.
- **Pure helpers stay React/Supabase-free** — `applyFilters`, `relativeDate`, `paginate`, and the `enrichJobs` comparator are unit-tested in isolation.
- **FilterBar copy is unchanged** — only filter _behavior_ changes; do not rename `Todos / Sem status / Candidatado / Descartado`.
- **`PAGE_SIZE = 50`**, exported from `src/utils/paginate.ts`.
- **pt-BR relative-date buckets** (whole-day diff `d`): `d<=0`→`hoje`; `d===1`→`ontem`; `2..6`→`há ${d} dias`; `7..13`→`semana passada`; `14..29`→`há ${Math.floor(d/7)} semanas`; `d>=30`→`há 1 mês`/`há ${Math.floor(d/30)} meses`.
- **ESLint:** one exported React component per file; files ≤ 250 lines; keep non-component helpers in their own files. Style: no semicolons, single quotes.
- Commit after each task with the message in its final step.

---

## File Structure

**Created:**

- `src/pages/dashboardFilters.ts` + `dashboardFilters.spec.ts` — `applyFilters`
- `src/utils/relativeDate.ts` + `relativeDate.spec.ts`
- `src/utils/paginate.ts` + `paginate.spec.ts`

**Modified:**

- `src/hooks/useJobs.ts` — `enrichJobs` comparator (#30)
- `src/hooks/useJobs.spec.tsx` — ordering + tiebreak tests
- `src/pages/DashboardPage.tsx` — import extracted `applyFilters`; add pagination
- `src/pages/DashboardPage.spec.tsx` — pagination tests
- `src/components/JobCard/JobCard.tsx` — relative added-date line (#33)
- `src/components/JobCard/JobCard.spec.tsx` — added-date test

**Note:** the three mock jobs (`src/data/mockData.ts`) share `scraped_at: '2026-06-20T06:00:00Z'`, so the existing `useJobs` "sorts by relevance_score descending" integration test still passes under the new sort (equal `scraped_at` → relevance tiebreak). Leave it; add focused `enrichJobs` ordering tests instead.

---

## Task 1: Sort feed by `scraped_at` desc (#30)

**Files:**

- Modify: `src/hooks/useJobs.ts`
- Test: `src/hooks/useJobs.spec.tsx`

**Interfaces:**

- Consumes: existing `enrichJobs(rawJobs: Job[], companies: Company[]): Job[]`, `baseJob` factory in the spec.
- Produces: `enrichJobs` ordered by `scraped_at` desc, tiebreak `relevance_score` desc.

- [ ] **Step 1: Add failing ordering tests** — append inside the existing `describe('enrichJobs', ...)` block in `src/hooks/useJobs.spec.tsx`:

```ts
it('orders by scraped_at descending (newest first)', () => {
  const older = baseJob({ id: 'old', scraped_at: '2026-06-01T00:00:00Z' })
  const newer = baseJob({ id: 'new', scraped_at: '2026-06-10T00:00:00Z' })
  const out = enrichJobs([older, newer], [])
  expect(out.map((j) => j.id)).toEqual(['new', 'old'])
})

it('breaks scraped_at ties by relevance_score descending', () => {
  // same scraped_at; titles give different computed relevance
  const lowScore = baseJob({ id: 'low', title: 'Manager', scraped_at: '2026-06-05T00:00:00Z' })
  const highScore = baseJob({
    id: 'high',
    title: 'React TypeScript Remote Engineer',
    scraped_at: '2026-06-05T00:00:00Z',
  })
  const out = enrichJobs([lowScore, highScore], [])
  expect(out.map((j) => j.id)).toEqual(['high', 'low'])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useJobs.spec.tsx`
Expected: FAIL — `orders by scraped_at descending` fails (current sort is relevance-only, so `['old','new']` order is not guaranteed newest-first).

- [ ] **Step 3: Implement the comparator** — in `src/hooks/useJobs.ts`, replace the `.sort(...)` call at the end of `enrichJobs`:

```ts
    .sort((a, b) => {
      const t = new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime()
      return t !== 0 ? t : (b.relevance_score ?? 0) - (a.relevance_score ?? 0)
    })
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useJobs.spec.tsx`
Expected: PASS (new ordering tests + existing tests, incl. the relevance-desc one which holds via the tiebreak on equal `scraped_at`).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useJobs.ts src/hooks/useJobs.spec.tsx
git commit -m "feat: order feed by scraped_at desc, relevance tiebreak (#30)"
```

---

## Task 2: Hide dismissed by default + extract `applyFilters` (#31)

**Files:**

- Create: `src/pages/dashboardFilters.ts`
- Test: `src/pages/dashboardFilters.spec.ts`
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**

- Produces: `export const applyFilters = (jobs: Job[], filters: FilterState): Job[]`.
- Consumes: `Job`, `FilterState` from `../types`.

- [ ] **Step 1: Write the failing test** — `src/pages/dashboardFilters.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { applyFilters } from './dashboardFilters'
import type { Job, FilterState } from '../types'

const job = (over: Partial<Job>): Job => ({
  id: 'j',
  title: 'T',
  company: 'C',
  url: 'u',
  location: null,
  description: null,
  posted_at: null,
  scraped_at: '2026-06-20T00:00:00Z',
  status: 'none',
  read: false,
  source_url: null,
  ...over,
})

const filters = (over: Partial<FilterState>): FilterState => ({
  status: 'all',
  relevance: 'all',
  wishlistOnly: false,
  unreadOnly: false,
  ...over,
})

describe('applyFilters', () => {
  it('hides dismissed jobs when status is "all"', () => {
    const jobs = [job({ id: 'a', status: 'none' }), job({ id: 'b', status: 'dismissed' })]
    expect(applyFilters(jobs, filters({})).map((j) => j.id)).toEqual(['a'])
  })

  it('shows only dismissed jobs when status is "dismissed"', () => {
    const jobs = [job({ id: 'a', status: 'none' }), job({ id: 'b', status: 'dismissed' })]
    expect(applyFilters(jobs, filters({ status: 'dismissed' })).map((j) => j.id)).toEqual(['b'])
  })

  it('matches exactly for "none" and "applied"', () => {
    const jobs = [
      job({ id: 'a', status: 'none' }),
      job({ id: 'b', status: 'applied' }),
      job({ id: 'c', status: 'dismissed' }),
    ]
    expect(applyFilters(jobs, filters({ status: 'none' })).map((j) => j.id)).toEqual(['a'])
    expect(applyFilters(jobs, filters({ status: 'applied' })).map((j) => j.id)).toEqual(['b'])
  })

  it('still applies relevance, wishlist, and unread filters', () => {
    const jobs = [
      job({ id: 'a', relevance_level: 'high', is_wishlist_company: true, read: false }),
      job({ id: 'b', relevance_level: 'low', is_wishlist_company: true, read: false }),
      job({ id: 'c', relevance_level: 'high', is_wishlist_company: false, read: true }),
    ]
    expect(applyFilters(jobs, filters({ relevance: 'high' })).map((j) => j.id)).toEqual(['a', 'c'])
    expect(applyFilters(jobs, filters({ wishlistOnly: true })).map((j) => j.id)).toEqual(['a', 'b'])
    expect(applyFilters(jobs, filters({ unreadOnly: true })).map((j) => j.id)).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/dashboardFilters.spec.ts`
Expected: FAIL — `./dashboardFilters` not found.

- [ ] **Step 3: Create `src/pages/dashboardFilters.ts`**:

```ts
import type { Job, FilterState } from '../types'

export const applyFilters = (jobs: Job[], filters: FilterState): Job[] =>
  jobs.filter((job) => {
    if (filters.status === 'all') {
      if (job.status === 'dismissed') return false
    } else if (job.status !== filters.status) {
      return false
    }
    if (filters.relevance !== 'all' && job.relevance_level !== filters.relevance) return false
    if (filters.wishlistOnly && !job.is_wishlist_company) return false
    if (filters.unreadOnly && job.read) return false
    return true
  })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/dashboardFilters.spec.ts`
Expected: PASS.

- [ ] **Step 5: Wire into `DashboardPage`** — in `src/pages/DashboardPage.tsx`, delete the inline `applyFilters` function (lines 9-19) and add the import after the other imports:

```ts
import { applyFilters } from './dashboardFilters'
```

The `useMemo(() => applyFilters(jobs, filters), [jobs, filters])` call stays unchanged.

- [ ] **Step 6: Run the dashboard + filter tests**

Run: `npx vitest run src/pages/DashboardPage.spec.tsx src/pages/dashboardFilters.spec.ts`
Expected: PASS (existing DashboardPage tests still green; default mock jobs are `status: 'none'`, so none are hidden).

- [ ] **Step 7: Commit**

```bash
git add src/pages/dashboardFilters.ts src/pages/dashboardFilters.spec.ts src/pages/DashboardPage.tsx
git commit -m "feat: hide dismissed jobs by default; extract applyFilters (#31)"
```

---

## Task 3: Relative added-date on the card (#33)

**Files:**

- Create: `src/utils/relativeDate.ts`
- Test: `src/utils/relativeDate.spec.ts`
- Modify: `src/components/JobCard/JobCard.tsx`
- Test: `src/components/JobCard/JobCard.spec.tsx`

**Interfaces:**

- Produces: `export const relativeDate = (iso: string, now?: Date): string`.

- [ ] **Step 1: Write the failing helper test** — `src/utils/relativeDate.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { relativeDate } from './relativeDate'

const now = new Date('2026-06-30T12:00:00Z')
// build an ISO string `d` whole days before `now` (at 00:00 to avoid hour drift)
const daysAgo = (d: number) => {
  const base = new Date('2026-06-30T00:00:00Z')
  base.setUTCDate(base.getUTCDate() - d)
  return base.toISOString()
}

describe('relativeDate', () => {
  it('returns "hoje" for today (and future)', () => {
    expect(relativeDate(daysAgo(0), now)).toBe('hoje')
    expect(relativeDate('2026-07-05T00:00:00Z', now)).toBe('hoje')
  })
  it('returns "ontem" for 1 day', () => {
    expect(relativeDate(daysAgo(1), now)).toBe('ontem')
  })
  it('returns "há N dias" for 2..6 days', () => {
    expect(relativeDate(daysAgo(2), now)).toBe('há 2 dias')
    expect(relativeDate(daysAgo(6), now)).toBe('há 6 dias')
  })
  it('returns "semana passada" for 7..13 days', () => {
    expect(relativeDate(daysAgo(7), now)).toBe('semana passada')
    expect(relativeDate(daysAgo(13), now)).toBe('semana passada')
  })
  it('returns "há N semanas" for 14..29 days', () => {
    expect(relativeDate(daysAgo(14), now)).toBe('há 2 semanas')
    expect(relativeDate(daysAgo(29), now)).toBe('há 4 semanas')
  })
  it('returns months for >= 30 days, singular at 1 month', () => {
    expect(relativeDate(daysAgo(30), now)).toBe('há 1 mês')
    expect(relativeDate(daysAgo(75), now)).toBe('há 2 meses')
  })
  it('returns "hoje" for an unparseable date', () => {
    expect(relativeDate('not-a-date', now)).toBe('hoje')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/relativeDate.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/utils/relativeDate.ts`:

```ts
const MS_PER_DAY = 86_400_000

const startOfDay = (d: Date): number =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())

export const relativeDate = (iso: string, now: Date = new Date()): string => {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'hoje'

  const d = Math.round((startOfDay(now) - startOfDay(new Date(then))) / MS_PER_DAY)

  if (d <= 0) return 'hoje'
  if (d === 1) return 'ontem'
  if (d <= 6) return `há ${d} dias`
  if (d <= 13) return 'semana passada'
  if (d <= 29) return `há ${Math.floor(d / 7)} semanas`
  const months = Math.floor(d / 30)
  return months === 1 ? 'há 1 mês' : `há ${months} meses`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/relativeDate.spec.ts`
Expected: PASS.

- [ ] **Step 5: Add a failing JobCard test** — append inside `describe('JobCard', ...)` in `src/components/JobCard/JobCard.spec.tsx`:

```ts
  it('shows the relative added-date from scraped_at', () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText(/^adicionado /)).toBeInTheDocument()
  })
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/components/JobCard/JobCard.spec.tsx`
Expected: FAIL — no "adicionado " text yet.

- [ ] **Step 7: Render the line in `JobCard`** — in `src/components/JobCard/JobCard.tsx`, add the import after the existing imports:

```ts
import { relativeDate } from '../../utils/relativeDate'
```

and add this line inside the company `<div>` block, right after the company `<p>` (the `<p className="text-gray-400 text-sm mt-0.5">...</p>`):

```tsx
<p className="text-gray-600 text-xs mt-1">adicionado {relativeDate(job.scraped_at)}</p>
```

- [ ] **Step 8: Run JobCard tests to verify they pass**

Run: `npx vitest run src/components/JobCard/JobCard.spec.tsx`
Expected: PASS (existing + new).

- [ ] **Step 9: Commit**

```bash
git add src/utils/relativeDate.ts src/utils/relativeDate.spec.ts src/components/JobCard/JobCard.tsx src/components/JobCard/JobCard.spec.tsx
git commit -m "feat: relative added-date on job card (#33)"
```

---

## Task 4: Client-side pagination, 50/page (#32)

**Files:**

- Create: `src/utils/paginate.ts`
- Test: `src/utils/paginate.spec.ts`
- Modify: `src/pages/DashboardPage.tsx`
- Test: `src/pages/DashboardPage.spec.tsx`

**Interfaces:**

- Consumes: `applyFilters` (Task 2).
- Produces: `export const PAGE_SIZE = 50`; `export const paginate = <T>(items: T[], page: number, size?: number): { pageItems: T[]; totalPages: number }`.

- [ ] **Step 1: Write the failing helper test** — `src/utils/paginate.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { paginate, PAGE_SIZE } from './paginate'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('paginate', () => {
  it('exposes a page size of 50', () => {
    expect(PAGE_SIZE).toBe(50)
  })
  it('returns the first page and total page count', () => {
    const { pageItems, totalPages } = paginate(range(120), 1)
    expect(pageItems).toEqual(range(50))
    expect(totalPages).toBe(3)
  })
  it('returns the last partial page', () => {
    const { pageItems } = paginate(range(120), 3)
    expect(pageItems).toEqual(Array.from({ length: 20 }, (_, i) => 100 + i))
  })
  it('clamps a too-low page to 1', () => {
    expect(paginate(range(120), 0).pageItems).toEqual(range(50))
  })
  it('clamps a too-high page to the last page', () => {
    expect(paginate(range(120), 99).pageItems[0]).toBe(100)
  })
  it('treats an empty list as a single page', () => {
    expect(paginate([], 1)).toEqual({ pageItems: [], totalPages: 1 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/paginate.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `src/utils/paginate.ts`:

```ts
export const PAGE_SIZE = 50

export const paginate = <T>(
  items: T[],
  page: number,
  size = PAGE_SIZE
): { pageItems: T[]; totalPages: number } => {
  const totalPages = Math.max(1, Math.ceil(items.length / size))
  const clamped = Math.min(Math.max(page, 1), totalPages)
  const start = (clamped - 1) * size
  return { pageItems: items.slice(start, start + size), totalPages }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/paginate.spec.ts`
Expected: PASS.

- [ ] **Step 5: Add failing DashboardPage tests** — append inside `describe('DashboardPage', ...)` in `src/pages/DashboardPage.spec.tsx` (and add the imports `userEvent` + the mocked `supabase` at the top of the file):

At the top, after the existing imports, add:

```ts
import userEvent from '@testing-library/user-event'
import { supabase } from '../lib/supabase'
```

Then the tests:

```ts
  it('does not show pagination controls when there is a single page', async () => {
    render(<DashboardPage />, { wrapper: makeWrapper() })
    await waitFor(() => expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /próxima/i })).not.toBeInTheDocument()
  })

  it('paginates and resets to page 1 when a filter changes', async () => {
    // seed > 50 jobs so there are 2 pages (3 mock jobs already exist)
    for (let i = 0; i < 60; i++) {
      await supabase.from('jobs').insert({
        title: `Seeded Role ${i}`, company: 'Seed Co', url: `https://seed/${i}`,
        location: null, description: null, posted_at: null,
        scraped_at: '2026-06-01T00:00:00Z', status: 'none', read: false, source_url: null,
      })
    }
    render(<DashboardPage />, { wrapper: makeWrapper() })
    await waitFor(() => expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /próxima/i }))
    expect(screen.getByText(/Página 2 de 2/)).toBeInTheDocument()

    // change a filter → page resets to 1
    await userEvent.click(screen.getByLabelText(/não lidas/i))
    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled()
  })
```

- [ ] **Step 6: Run them to verify they fail**

Run: `npx vitest run src/pages/DashboardPage.spec.tsx`
Expected: FAIL — no pagination controls / "Página" text rendered yet.

- [ ] **Step 7: Implement pagination in `DashboardPage`** — update `src/pages/DashboardPage.tsx`:

Change the React import to include `useEffect` and `useState`:

```ts
import { useEffect, useMemo, useState } from 'react'
```

Add the paginate import after the `applyFilters` import:

```ts
import { paginate } from '../utils/paginate'
```

Inside the component, after `const filteredJobs = useMemo(...)`, add:

```ts
const [page, setPage] = useState(1)
useEffect(() => setPage(1), [filters])
const { pageItems, totalPages } = paginate(filteredJobs, page)
```

Replace `{filteredJobs.map((job) => (` with `{pageItems.map((job) => (` (the empty-state check on `filteredJobs.length === 0` stays as-is).

Add the controls just before the closing `</main>`:

```tsx
{
  totalPages > 1 && (
    <div className="flex items-center justify-center gap-3 mt-2 text-sm text-gray-400">
      <button
        type="button"
        onClick={() => setPage((p) => p - 1)}
        disabled={page <= 1}
        className="border border-gray-700 rounded px-3 py-1 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors"
      >
        Anterior
      </button>
      <span>
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        onClick={() => setPage((p) => p + 1)}
        disabled={page >= totalPages}
        className="border border-gray-700 rounded px-3 py-1 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors"
      >
        Próxima
      </button>
    </div>
  )
}
```

- [ ] **Step 8: Run DashboardPage tests to verify they pass**

Run: `npx vitest run src/pages/DashboardPage.spec.tsx`
Expected: PASS (existing + 2 new).

- [ ] **Step 9: Commit**

```bash
git add src/utils/paginate.ts src/utils/paginate.spec.ts src/pages/DashboardPage.tsx src/pages/DashboardPage.spec.tsx
git commit -m "feat: client-side pagination 50/page on feed (#32)"
```

---

## Task 5: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `npm run test:run`
Expected: PASS (all existing + new feed tests).

- [ ] **Step 2: Coverage threshold**

Run: `npm run coverage`
Expected: PASS at ≥ 80% lines/functions (the new pure helpers and DashboardPage paths are covered).

- [ ] **Step 3: Lint + build**

Run: `npm run lint && npm run build`
Expected: no lint errors (the pre-existing `UIContext.tsx` warning is unrelated); `tsc -b && vite build` succeeds.

- [ ] **Step 4: Final commit (only if verification needed fixups)**

```bash
git add -A
git commit -m "chore: verification fixups for feed improvements (#30-#33)"
```

---

## Self-Review Notes

- **Spec coverage:** #30 → Task 1; #31 → Task 2 (extract + semantics); #33 → Task 3 (helper + JobCard); #32 → Task 4 (helper + DashboardPage). Verification → Task 5. Each issue's acceptance-criteria tests are present.
- **Mock-data caveat handled:** the equal-`scraped_at` mock means the existing relevance-order integration test stays green; #30 ordering is proven by dedicated `enrichJobs` tests with distinct timestamps.
- **Type consistency:** `applyFilters(Job[], FilterState)` (Task 2) consumed by DashboardPage (Task 4); `paginate<T>` / `PAGE_SIZE` (Task 4) match their tests; `relativeDate(string, now?)` (Task 3) matches the JobCard call and helper tests.
- **No placeholders:** every code/test step shows complete content; the DashboardPage pagination test seeds 60 jobs through the in-memory Supabase fake so there are genuinely 2 pages.
- **DashboardPage churn ordered:** Task 2 only swaps `applyFilters` for an import; Task 4 adds the pagination state/controls — sequenced so the two edits don't collide.
