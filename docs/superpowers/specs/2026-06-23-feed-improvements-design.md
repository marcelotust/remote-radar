# Feed Improvements — Design

**Issues:** [#30](https://github.com/marcelotust/remote-radar/issues/30) (sort by `scraped_at`), [#31](https://github.com/marcelotust/remote-radar/issues/31) (hide dismissed by default), [#32](https://github.com/marcelotust/remote-radar/issues/32) (client-side pagination), [#33](https://github.com/marcelotust/remote-radar/issues/33) (relative added-date) — all part of #28.
**Date:** 2026-06-23
**Status:** Approved (brainstorming)

## Objective

Four cohesive improvements to the `DashboardPage` job feed: order by when a job
entered the database, hide dismissed jobs by default, paginate 50 at a time, and
show a relative "added" date on each card. The issues already fix the design
decisions (including choosing client-side pagination); this spec consolidates
them into one implementation, with two small extractions for testability.

## Scope & approach

All four ship together (one plan). Implementation order minimizes churn on
`DashboardPage` (which #31 and #32 both touch): #30 → #31 → #33 → #32.

### #30 — Sort by `scraped_at` desc (tiebreak `relevance_score` desc)

`enrichJobs` in `src/hooks/useJobs.ts` currently sorts by `relevance_score`
desc. Replace the comparator with primary `scraped_at` desc, tiebreak
`relevance_score` desc:

```ts
.sort((a, b) => {
  const t = new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime()
  return t !== 0 ? t : (b.relevance_score ?? 0) - (a.relevance_score ?? 0)
})
```

Relevance stays available as a badge and filter (`relevance_level` unchanged).
The existing `useJobs` test that asserts relevance-desc ordering is updated to
assert `scraped_at`-desc, and a new test covers the tiebreak (equal
`scraped_at`, different score).

### #31 — Dismissed jobs hidden by default

`applyFilters` is currently a private function inside `DashboardPage.tsx`. Move
it to `src/pages/dashboardFilters.ts` as a named export `applyFilters(jobs,
filters)` so it is unit-testable, and import it back into `DashboardPage`. New
status semantics:

- `filters.status === 'all'` → include everything **except** `job.status ===
'dismissed'`.
- `filters.status === 'dismissed'` → only dismissed.
- `'none'` / `'applied'` → unchanged (exact-match as today).

Logic:

```ts
if (filters.status === 'all') {
  if (job.status === 'dismissed') return false
} else if (job.status !== filters.status) {
  return false
}
```

Other filters (relevance, wishlistOnly, unreadOnly) unchanged. The `FilterBar`
**keeps its current labels** (`Todos / Sem status / Candidatado / Descartado`)
— only behavior changes, no copy rename (avoids scope creep). Tests on
`applyFilters` cover: default hides dismissed; `dismissed` shows only dismissed;
`none`/`applied` still exact-match; relevance/wishlist/unread still apply.

### #33 — Relative added-date on the card

New pure helper `src/utils/relativeDate.ts`:

```ts
export const relativeDate = (iso: string, now?: Date): string
```

pt-BR buckets, by whole-day difference `d` between `now` (default `new Date()`)
and the parsed date:

- `d <= 0` → `hoje`
- `d === 1` → `ontem`
- `2 <= d <= 6` → `há ${d} dias`
- `7 <= d <= 13` → `semana passada`
- `14 <= d <= 29` → `há ${Math.floor(d / 7)} semanas` (always ≥ 2 → plural)
- `d >= 30` → months `m = Math.floor(d / 30)`: `há 1 mês` (singular) /
  `há ${m} meses`

Day difference is computed from calendar days (zero out time) so "today" vs
"yesterday" is robust to hours. `JobCard` (`src/components/JobCard/JobCard.tsx`)
renders `adicionado ${relativeDate(job.scraped_at)}` as a small muted line.
Relative only — no absolute date / tooltip. Tests cover every bucket and the
boundaries 1d, 6d, 7d, 13d, 14d, 30d (plus the singular `há 1 mês`).

### #32 — Client-side pagination, 50 per page

New pure helper `src/utils/paginate.ts`:

```ts
export const PAGE_SIZE = 50
export const paginate = <T>(items: T[], page: number, size = PAGE_SIZE):
  { pageItems: T[]; totalPages: number }
```

`totalPages = Math.max(1, Math.ceil(items.length / size))`; `page` is clamped to
`[1, totalPages]` before slicing, so an out-of-range page never yields an empty
slice. `DashboardPage`:

- `const [page, setPage] = useState(1)`.
- `const { pageItems, totalPages } = paginate(filteredJobs, page)`; render
  `pageItems` instead of all `filteredJobs`.
- Reset to page 1 when filters change: `useEffect(() => setPage(1), [filters])`.
- Footer controls **Anterior / Próxima** + indicator `Página X de Y`, shown only
  when `totalPages > 1`. Anterior disabled on page 1, Próxima on the last page.

The empty-state and loading messages stay as-is. Tests: `paginate` (slice,
total pages, clamp at both ends, empty list → 1 page); `DashboardPage` (controls
hidden with ≤1 page; reset to page 1 after a filter change).

## Architecture & boundaries

- **Pure, testable units:** `applyFilters` (dashboardFilters.ts), `relativeDate`
  (utils), `paginate` (utils), and the `enrichJobs` comparator — none touch React
  or Supabase, all unit-tested in isolation.
- **`DashboardPage`** is the only stateful composition point: it owns `page`,
  composes `useJobs` → `applyFilters` → `paginate`, and renders the controls.
- No schema, type, or data-layer change: `scraped_at` and `status` already exist
  on `Job`. No new Supabase columns or queries.

## Error handling

- `relativeDate` parses `scraped_at` (always set — `default now()` in schema). A
  malformed/missing value would yield `NaN` day-diff; the helper guards by
  returning `hoje` when the parsed time is `NaN`, so the card never renders
  "Invalid Date".
- `paginate` clamps `page`, so stale page state after the list shrinks (e.g.
  filtering) can't produce an empty page even before the reset effect runs.

## Testing

- `useJobs.spec.tsx` — updated ordering assertion (`scraped_at` desc) + new
  tiebreak test.
- `dashboardFilters.spec.ts` — status semantics (default hides dismissed;
  `dismissed` only; `none`/`applied`; other filters intact).
- `relativeDate.spec.ts` — all buckets + boundaries (1d, 6d, 7d, 13d, 14d, 30d)
  - singular `há 1 mês`, computed against a fixed `now` for determinism.
- `paginate.spec.ts` — slicing, total pages, clamping, empty list.
- `DashboardPage.spec.tsx` — pagination controls hidden with ≤1 page; page
  resets to 1 when filters change. (Existing DashboardPage tests must still pass;
  with the default fixture under 50 jobs, no controls render.)

## Out of scope

- Server-side pagination / `.range()` (the issue explicitly chose client-side
  because filtering + enrichment are client-side).
- Renaming `FilterBar` copy or adding new filter controls.
- Absolute dates / tooltips on the card (#33 is relative-only).
- Persisting page or sort preference across reloads.

## Implementation order

1. #30 — `enrichJobs` comparator (`useJobs.ts`) + tests.
2. #31 — extract `applyFilters` to `dashboardFilters.ts`, new semantics, wire
   back into `DashboardPage` + tests.
3. #33 — `relativeDate.ts` helper + `JobCard` line + tests.
4. #32 — `paginate.ts` helper + `DashboardPage` pagination + tests.
