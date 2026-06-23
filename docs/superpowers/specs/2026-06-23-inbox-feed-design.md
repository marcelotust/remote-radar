# Design — Job Feed Inbox + Responsive Bottom Sheet / Split-View (#9)

**Status:** approved (design phase)
**Issue:** #9 — Refactor Job Feed UX: High-Density Inbox Layout with Responsive Bottom Sheet
**Date:** 2026-06-23

## Objective

Transition the Dashboard job feed from neon "cards" into a high-density,
email-style **inbox list**, with a mobile-first interaction model: a custom
**Bottom Sheet** on small screens that becomes a **Split-View** on `lg+`
desktops. All styling stays within the established **Neon Bubble** raw-Tailwind
design system. No new runtime dependencies.

## Decisions (from brainstorming)

- **Sequencing:** #9 first, then #10 (mobile-first + global max-width container)
  as a separate follow-up PR. The split-view here defines the Dashboard's
  responsive layout; #10 formalizes the global container and covers
  Wishlist / header / modals.
- **Pagination:** keep the existing 20-per-page pagination below the list
  (not infinite scroll, not a single unbounded list).
- **Read behavior:** opening a job (sheet on mobile / panel on desktop)
  **auto-marks it read** via the existing `useToggleJobRead`. The explicit
  read/unread button still allows toggling back to unread.
- **Row layout:** **two compact lines** (not strict single-line), while still
  using `truncate` + `min-w-0` so long titles/company names degrade gracefully.
- **Selection state:** kept **local to `DashboardPage`** (`selectedJob`),
  not added to `UIContext` — it is only consumed within the Dashboard subtree.

### Conscious deviations from the issue text

| Issue says                                    | We do                       | Why                                                   |
| --------------------------------------------- | --------------------------- | ----------------------------------------------------- |
| Single-line rows                              | Two compact lines           | User preference; mobile readability. Still truncates. |
| (implies scroll list)                         | Keep 20-per-page pagination | User preference; avoids very long lists.              |
| (unspecified)                                 | Auto-mark read on open      | User preference; matches "triaged" inbox model.       |
| (stale) "combine with shadcn migration" (#10) | Raw Tailwind only           | Project dropped shadcn; #9 mandates zero deps.        |

## Architecture — four isolated units

### 1. `JobRow` — `src/components/JobRow/JobRow.tsx`

Compact two-line row replacing the card in the list.

- **Props:** `{ job: Job; selected: boolean; onSelect: (job: Job) => void }`
- **Line 1:** unread dot (`w-2 h-2 rounded-full bg-brand-green shadow-[0_0_8px_#90EDA2]`,
  rendered only when `!job.read`) + title (`truncate min-w-0`) + relevance
  badge (`ScoreBadge`) pinned right.
- **Line 2 (muted, smaller):** `company · location · <relative date>`, truncated.
- **Read state:** read rows use dimmer text (e.g. `text-gray-500` title vs
  `text-gray-100` unread) to signal triage.
- **Selected state:** `border-brand-green/60 bg-brand-green/5`; unselected has a
  subtle bottom divider (`border-brand-gray/15`).
- Whole row is a `<button>`/clickable with `onClick={() => onSelect(job)}`;
  accessible name = title.

### 2. `JobDetail` — `src/components/JobDetail/JobDetail.tsx`

Shared detail content used by **both** the Bottom Sheet (mobile) and the
desktop right panel — single source of truth for the detail UI.

- **Props:** `{ job: Job }`
- Renders: `ScoreBadge` + `RemoteBrazilBadge` (when wishlist), title,
  `company · location`, relative date, **full description**
  (`whitespace-pre-line`, with an empty-state line when `description` is null),
  and the action row currently living in `JobCard`: `StatusDropdown`
  (wired to `useUpdateJobStatus`), read/unread toggle (`useToggleJobRead`),
  "Ver vaga" link, `NetworkingButton`.

### 3. `BottomSheet` — `src/components/BottomSheet/BottomSheet.tsx`

Pure React + Tailwind overlay; **mobile only** (`lg:hidden`).

- **Props:** `{ open: boolean; onClose: () => void; children: ReactNode }`
- **Backdrop:** `fixed inset-0 bg-black/40 backdrop-blur-[2px]`, click closes.
- **Sheet:** anchored `bottom-0`, `bg-brand-surface rounded-t-[2rem]
border-t-2 border-brand-green/30`, max-height with internal scroll.
- **Drag handle (visual only):** `w-12 h-1.5 bg-brand-gray/40 rounded-full`,
  centered at the top.
- **Animation:** slide via `translate-y-full → translate-y-0` with
  `transition-transform duration-300`. Component stays mounted while
  animating out, then unmounts (internal `entered`/`exiting` state driven by
  `open` + a 300ms timeout) so the close animation is visible.
- **Close:** backdrop click and `Escape` key.

### 4. `DashboardPage` (orchestration) — `src/pages/DashboardPage.tsx`

- NavBar + FilterBar full-width (unchanged), then a `max-w-6xl mx-auto` container.
- **Local state:** `selectedJob: Job | null`. `handleSelect(job)` sets it and,
  if `!job.read`, calls `toggleRead({ id, read: true })`.
- **Desktop (`lg+`):** `flex` — left list column `lg:w-2/5` with its own
  scroll; right panel `lg:w-3/5` `lg:sticky lg:top-6` showing `JobDetail`
  for `selectedJob`, or an empty state ("Selecione uma vaga para ver os
  detalhes."). No Bottom Sheet on desktop.
- **Mobile (`< lg`):** list full-width; `BottomSheet open={!!selectedJob}`
  renders `JobDetail` for the selected job. The right panel is `hidden lg:block`;
  the Bottom Sheet is `lg:hidden` — both can be mounted, CSS controls visibility.
- Pagination (existing `paginate`, 20/page) stays below the list. Changing
  filters/page resets selection where appropriate (selection cleared on filter
  change).

## Data flow

`useJobs` (unchanged) → `applyFilters` → `paginate` → list of `JobRow`.
`JobRow.onSelect` → `DashboardPage` sets `selectedJob` + marks read →
`JobDetail` reads the selected `Job` and drives `useUpdateJobStatus` /
`useToggleJobRead` exactly as `JobCard` does today.

## Components removed / repurposed

`JobCard` is currently used only by `DashboardPage`. Its action cluster moves
into `JobDetail`; the list now renders `JobRow`. `JobCard` is removed (and its
spec replaced by `JobRow` + `JobDetail` specs).

## Testing

- `JobRow.spec` — renders title/company; unread dot present only when unread;
  read rows use the dimmer class; click calls `onSelect` with the job.
- `JobDetail.spec` — renders description (and the null-description empty state);
  status change calls the mutation; read toggle present.
- `BottomSheet.spec` — renders children when `open`; backdrop click and Escape
  call `onClose`; nothing rendered when closed (after exit).
- `DashboardPage.spec` — selecting a row marks it read (in-memory Supabase fake)
  and surfaces the job's description; pagination still works.
- Responsive split vs sheet is CSS-only (`lg:`), not asserted in jsdom.

## Out of scope (YAGNI)

Drag-to-dismiss gestures (only the visual handle), animation libraries
(Framer Motion / Headless UI), infinite scroll, and the global max-width
container for Wishlist/header/modals (that is #10).
