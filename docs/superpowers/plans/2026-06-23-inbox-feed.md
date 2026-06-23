# Inbox Feed + Responsive Sheet/Split-View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Dashboard's neon job cards with a high-density inbox list whose rows open a Bottom Sheet on mobile and update a Split-View detail panel on desktop.

**Architecture:** Four isolated units — `JobRow` (compact two-line list item), `JobDetail` (shared detail content), `BottomSheet` (mobile overlay), and `DashboardPage` (orchestrates selection + responsive layout). Selection lives as local state in `DashboardPage`; opening a job auto-marks it read via the existing `useToggleJobRead`.

**Tech Stack:** React 19, TypeScript, Tailwind v4 (raw, Neon Bubble tokens), TanStack Query, Vitest + React Testing Library.

## Global Constraints

- **Zero new runtime dependencies.** Bottom Sheet / Split-View use only React state + Tailwind transitions (`transition-transform`, `translate-y-full`, etc.). No Framer Motion / Headless UI.
- **Styling:** raw Tailwind with existing Neon Bubble tokens (`brand-bg`, `brand-surface`, `brand-green`, `brand-gray`, `shadow-neon-*`). No component libraries.
- **Pagination:** keep existing `paginate` (20/page).
- **Tests:** co-located `Component/Component.spec.tsx`; React Query consumers wrapped in a fresh `QueryClientProvider` per test; `UIProvider`/`MemoryRouter` where needed.
- **Lint/format:** `npm run lint`, `npm run build`, `npm run test:run` must pass; a pre-existing `react-refresh` warning in `UIContext.tsx` is acceptable.
- **Commit trailer:** end every commit message with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

### Task 1: `BottomSheet` — mobile overlay

**Files:**

- Create: `src/components/BottomSheet/BottomSheet.tsx`
- Test: `src/components/BottomSheet/BottomSheet.spec.tsx`

**Interfaces:**

- Consumes: nothing from other tasks.
- Produces: `BottomSheet({ open: boolean; onClose: () => void; children: React.ReactNode })` — fixed overlay, `lg:hidden`; slide-up sheet; closes on backdrop click and Escape.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/BottomSheet/BottomSheet.spec.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BottomSheet } from './BottomSheet'

describe('BottomSheet', () => {
  it('renders nothing when closed', () => {
    render(
      <BottomSheet open={false} onClose={() => {}}>
        <p>Detail body</p>
      </BottomSheet>
    )
    expect(screen.queryByText('Detail body')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders children and a drag handle when open', () => {
    render(
      <BottomSheet open onClose={() => {}}>
        <p>Detail body</p>
      </BottomSheet>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Detail body')).toBeInTheDocument()
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <p>Detail body</p>
      </BottomSheet>
    )
    await userEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <p>Detail body</p>
      </BottomSheet>
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/BottomSheet/BottomSheet.spec.tsx`
Expected: FAIL — cannot resolve `./BottomSheet`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/BottomSheet/BottomSheet.tsx
import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

/**
 * Neon Bubble mobile bottom sheet (#9). Pure React + Tailwind: slides up via a
 * translate-y transition, stays mounted through the exit animation, and closes
 * on backdrop click or Escape. Hidden on lg+ (desktop uses the split-view panel).
 */
export const BottomSheet = ({ open, onClose, children }: Props) => {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(id)
    }
    setEntered(false)
    const t = setTimeout(() => setMounted(false), 300)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Fechar detalhes"
        onClick={onClose}
        className={`absolute inset-0 h-full w-full bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-brand-surface rounded-t-[2rem] border-t-2 border-brand-green/30 p-5 transition-transform duration-300 ${
          entered ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-brand-gray/40" />
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/BottomSheet/BottomSheet.spec.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/BottomSheet
git commit -m "feat: BottomSheet mobile overlay component (#9)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `JobDetail` — shared detail content

**Files:**

- Create: `src/components/JobDetail/JobDetail.tsx`
- Test: `src/components/JobDetail/JobDetail.spec.tsx`

**Interfaces:**

- Consumes: `useUpdateJobStatus()` → `{ mutate }` called as `mutate({ id, status })`; `useToggleJobRead()` → `{ mutate }` called as `mutate({ id, read })`; `ScoreBadge`, `RemoteBrazilBadge`, `StatusDropdown`, `NetworkingButton`, `relativeDate`.
- Produces: `JobDetail({ job: Job })` — full detail block (badges, title, company·location, date, description, status dropdown, read toggle, "Ver vaga", networking).

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/JobDetail/JobDetail.spec.tsx
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { JobDetail } from './JobDetail'
import type { Job } from '../../types'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

const baseJob: Job = {
  id: 'j1',
  title: 'Senior Frontend Engineer',
  company: 'Stripe',
  url: 'https://stripe.com/jobs/1',
  location: 'Remote',
  description: 'Build the dashboard with React and TypeScript.',
  posted_at: '2026-06-19T00:00:00Z',
  scraped_at: '2026-06-20T06:00:00Z',
  status: 'none',
  read: false,
  source_url: null,
  relevance_score: 3,
  relevance_level: 'high',
  is_wishlist_company: true,
  wishlist_remote_brazil: 'yes',
}

describe('JobDetail', () => {
  it('renders the title, company and full description', () => {
    render(<JobDetail job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    expect(screen.getByText('Stripe')).toBeInTheDocument()
    expect(screen.getByText('Build the dashboard with React and TypeScript.')).toBeInTheDocument()
  })

  it('falls back to a placeholder when description is null', () => {
    render(<JobDetail job={{ ...baseJob, description: null }} />, { wrapper: makeWrapper() })
    expect(screen.getByText(/sem descrição disponível/i)).toBeInTheDocument()
  })

  it('links to the original posting', () => {
    render(<JobDetail job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('link', { name: /ver vaga/i })).toHaveAttribute(
      'href',
      'https://stripe.com/jobs/1'
    )
  })

  it('renders the status dropdown and read toggle', () => {
    render(<JobDetail job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('combobox', { name: /status da vaga/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /marcar como lida/i })).toBeInTheDocument()
  })

  it('shows the RemoteBrazilBadge for wishlist companies', () => {
    render(<JobDetail job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Remote Brasil ✓')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/JobDetail/JobDetail.spec.tsx`
Expected: FAIL — cannot resolve `./JobDetail`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/JobDetail/JobDetail.tsx
import { ScoreBadge } from '../ScoreBadge/ScoreBadge'
import { RemoteBrazilBadge } from '../RemoteBrazilBadge/RemoteBrazilBadge'
import { StatusDropdown } from '../StatusDropdown/StatusDropdown'
import { NetworkingButton } from '../NetworkingButton/NetworkingButton'
import { useUpdateJobStatus } from '../../hooks/useUpdateJobStatus'
import { useToggleJobRead } from '../../hooks/useToggleJobRead'
import { relativeDate } from '../../utils/relativeDate'
import type { Job } from '../../types'

interface Props {
  job: Job
}

/**
 * Shared job detail content (#9), rendered by both the mobile BottomSheet and
 * the desktop split-view panel — single source of truth for the detail UI.
 */
export const JobDetail = ({ job }: Props) => {
  const { mutate: updateStatus } = useUpdateJobStatus()
  const { mutate: toggleRead } = useToggleJobRead()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {job.relevance_level && <ScoreBadge level={job.relevance_level} />}
        {job.is_wishlist_company && job.wishlist_remote_brazil && (
          <RemoteBrazilBadge status={job.wishlist_remote_brazil} />
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold leading-tight text-white">{job.title}</h2>
        <p className="mt-1 text-sm text-gray-400">
          {job.company}
          {job.location && <span className="text-gray-600"> · {job.location}</span>}
        </p>
        <p className="mt-1 text-xs text-gray-600">adicionado {relativeDate(job.scraped_at)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusDropdown
          value={job.status}
          onChange={(status) => updateStatus({ id: job.id, status })}
        />
        <button
          type="button"
          aria-label={job.read ? 'Marcar como não lida' : 'Marcar como lida'}
          onClick={() => toggleRead({ id: job.id, read: !job.read })}
          className="rounded-2xl border-2 border-brand-gray/30 px-3 py-1 text-xs text-gray-400 transition-all duration-300 hover:border-brand-green/60 hover:text-brand-green"
        >
          {job.read ? 'Não lida' : 'Lida'}
        </button>
      </div>

      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">
        {job.description ?? 'Sem descrição disponível.'}
      </p>

      <div className="flex items-center gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-green underline underline-offset-2 transition-all duration-300 hover:text-brand-green/80"
        >
          Ver vaga
        </a>
        <NetworkingButton companyName={job.company} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/JobDetail/JobDetail.spec.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/JobDetail
git commit -m "feat: JobDetail shared detail content (#9)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `JobRow` — compact two-line list item

**Files:**

- Create: `src/components/JobRow/JobRow.tsx`
- Test: `src/components/JobRow/JobRow.spec.tsx`

**Interfaces:**

- Consumes: `ScoreBadge`, `relativeDate`.
- Produces: `JobRow({ job: Job; selected: boolean; onSelect: (job: Job) => void })` — a `<button>` row; line 1 = unread dot (only when `!job.read`) + title + relevance badge; line 2 = company · location · date.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/JobRow/JobRow.spec.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { JobRow } from './JobRow'
import type { Job } from '../../types'

const baseJob: Job = {
  id: 'j1',
  title: 'Senior Frontend Engineer',
  company: 'Stripe',
  url: 'https://stripe.com/jobs/1',
  location: 'Remote',
  description: 'desc',
  posted_at: null,
  scraped_at: '2026-06-20T06:00:00Z',
  status: 'none',
  read: false,
  source_url: null,
  relevance_score: 3,
  relevance_level: 'high',
}

describe('JobRow', () => {
  it('renders the title and company', () => {
    render(<JobRow job={baseJob} selected={false} onSelect={() => {}} />)
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    expect(screen.getByText('Stripe')).toBeInTheDocument()
  })

  it('calls onSelect with the job when clicked', async () => {
    const onSelect = vi.fn()
    render(<JobRow job={baseJob} selected={false} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /senior frontend engineer/i }))
    expect(onSelect).toHaveBeenCalledWith(baseJob)
  })

  it('shows the unread dot when the job is unread', () => {
    const { container } = render(<JobRow job={baseJob} selected={false} onSelect={() => {}} />)
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1)
  })

  it('hides the unread dot when the job is read', () => {
    const { container } = render(
      <JobRow job={{ ...baseJob, read: true }} selected={false} onSelect={() => {}} />
    )
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })

  it('dims the title text when the job is read', () => {
    render(<JobRow job={{ ...baseJob, read: true }} selected={false} onSelect={() => {}} />)
    expect(screen.getByText('Senior Frontend Engineer')).toHaveClass('text-gray-500')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/JobRow/JobRow.spec.tsx`
Expected: FAIL — cannot resolve `./JobRow`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/JobRow/JobRow.tsx
import { ScoreBadge } from '../ScoreBadge/ScoreBadge'
import { relativeDate } from '../../utils/relativeDate'
import type { Job } from '../../types'

interface Props {
  job: Job
  selected: boolean
  onSelect: (job: Job) => void
}

/**
 * High-density inbox row (#9). Two compact lines with graceful truncation;
 * the unread dot glows, read rows dim, and the selected row is highlighted.
 */
export const JobRow = ({ job, selected, onSelect }: Props) => (
  <button
    type="button"
    onClick={() => onSelect(job)}
    className={`flex w-full flex-col gap-1 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-300 ${
      selected
        ? 'border-brand-green/60 bg-brand-green/5'
        : 'border-transparent hover:border-brand-green/30'
    }`}
  >
    <div className="flex min-w-0 items-center gap-2">
      {!job.read && (
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full bg-brand-green shadow-[0_0_8px_#90EDA2]"
        />
      )}
      <span
        className={`min-w-0 truncate text-sm ${
          job.read ? 'font-normal text-gray-500' : 'font-semibold text-gray-100'
        }`}
      >
        {job.title}
      </span>
      {job.relevance_level && (
        <span className="ml-auto shrink-0">
          <ScoreBadge level={job.relevance_level} />
        </span>
      )}
    </div>
    <div className="flex min-w-0 items-center gap-1 text-xs text-gray-500">
      <span className="min-w-0 truncate">{job.company}</span>
      {job.location && <span className="min-w-0 truncate">· {job.location}</span>}
      <span className="ml-auto shrink-0">{relativeDate(job.scraped_at)}</span>
    </div>
  </button>
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/JobRow/JobRow.spec.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/JobRow
git commit -m "feat: JobRow compact inbox row (#9)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `DashboardPage` integration + remove `JobCard`

**Files:**

- Modify: `src/pages/DashboardPage.tsx` (full rewrite of the render + state)
- Modify: `src/pages/DashboardPage.spec.tsx` (add selection test; keep pagination tests)
- Delete: `src/components/JobCard/JobCard.tsx`, `src/components/JobCard/JobCard.spec.tsx`

**Interfaces:**

- Consumes: `JobRow` (Task 3), `JobDetail` (Task 2), `BottomSheet` (Task 1), `useJobs`, `useToggleJobRead`, `useUIContext`, `applyFilters`, `paginate`.
- Produces: the integrated Dashboard. No exports consumed by other tasks.

- [ ] **Step 1: Add the selection test (failing) to `DashboardPage.spec.tsx`**

Add this test inside the existing `describe('DashboardPage', ...)` block (after the pagination test). Leave the existing tests unchanged except the rename in Step 2:

```tsx
it('opens a job detail and marks it read when a row is selected', async () => {
  render(<DashboardPage />, { wrapper: makeWrapper() })
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /senior frontend engineer/i })).toBeInTheDocument()
  )
  await userEvent.click(screen.getByRole('button', { name: /senior frontend engineer/i }))
  // detail panel appears and the job is now read (toggle flips to "marcar como não lida")
  await waitFor(() =>
    expect(screen.getAllByRole('button', { name: /marcar como não lida/i }).length).toBeGreaterThan(
      0
    )
  )
})
```

- [ ] **Step 2: Run the spec to verify the new test fails**

Run: `npx vitest run src/pages/DashboardPage.spec.tsx`
Expected: FAIL — clicking the title text finds no `button` (current `JobCard` title is an `<h2>`, not a button), so `getByRole('button', { name: /senior frontend engineer/i })` throws.

- [ ] **Step 3: Rewrite `DashboardPage.tsx`**

```tsx
// src/pages/DashboardPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { NavBar } from '../components/NavBar/NavBar'
import { FilterBar } from '../components/FilterBar/FilterBar'
import { JobRow } from '../components/JobRow/JobRow'
import { JobDetail } from '../components/JobDetail/JobDetail'
import { BottomSheet } from '../components/BottomSheet/BottomSheet'
import { useJobs } from '../hooks/useJobs'
import { useToggleJobRead } from '../hooks/useToggleJobRead'
import { useUIContext } from '../contexts/UIContext'
import { applyFilters } from './dashboardFilters'
import { paginate } from '../utils/paginate'
import type { Job } from '../types'

const pageButtonClass =
  'rounded-2xl border-2 border-brand-gray/30 px-3 py-1 transition-all duration-300 hover:border-brand-green/60 hover:text-brand-green disabled:opacity-40 disabled:hover:border-brand-gray/30 disabled:hover:text-gray-400'

export const DashboardPage = () => {
  const { data: jobs = [], isLoading } = useJobs()
  const { filters } = useUIContext()
  const { mutate: toggleRead } = useToggleJobRead()

  const filteredJobs = useMemo(() => applyFilters(jobs, filters), [jobs, filters])

  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  useEffect(() => {
    setPage(1)
    setSelectedId(null)
  }, [filters])

  const { pageItems, totalPages } = paginate(filteredJobs, page)
  const selectedJob = jobs.find((j) => j.id === selectedId) ?? null

  const handleSelect = (job: Job) => {
    setSelectedId(job.id)
    if (!job.read) toggleRead({ id: job.id, read: true })
  }

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <NavBar />
      <FilterBar />
      <main className="mx-auto flex max-w-6xl flex-col px-4 py-6 lg:flex-row lg:items-start lg:gap-6">
        <div className="flex w-full flex-col gap-1 lg:w-2/5">
          {isLoading && <p className="text-sm text-gray-500">Carregando vagas...</p>}
          {!isLoading && filteredJobs.length === 0 && (
            <p className="text-sm text-gray-500">Nenhuma vaga encontrada.</p>
          )}
          {pageItems.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              selected={job.id === selectedId}
              onSelect={handleSelect}
            />
          ))}
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-3 text-sm text-gray-400">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className={pageButtonClass}
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
                className={pageButtonClass}
              >
                Próxima
              </button>
            </div>
          )}
        </div>

        <aside className="hidden rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6 lg:sticky lg:top-6 lg:block lg:w-3/5">
          {selectedJob ? (
            <JobDetail job={selectedJob} />
          ) : (
            <p className="text-sm text-gray-500">Selecione uma vaga para ver os detalhes.</p>
          )}
        </aside>
      </main>

      <BottomSheet open={!!selectedJob} onClose={() => setSelectedId(null)}>
        {selectedJob && <JobDetail job={selectedJob} />}
      </BottomSheet>
    </div>
  )
}
```

- [ ] **Step 4: Delete the obsolete `JobCard`**

```bash
git rm src/components/JobCard/JobCard.tsx src/components/JobCard/JobCard.spec.tsx
```

- [ ] **Step 5: Run the full suite + typecheck + lint**

Run: `npm run test:run && npm run build && npm run lint`
Expected: all tests pass (including the new selection test), build clean, lint clean apart from the pre-existing `UIContext.tsx` `react-refresh` warning.

Note: jsdom renders both the desktop `<aside>` and the open `BottomSheet`, so the selection test uses `getAllByRole(...).length > 0` rather than `getByRole` for the read toggle. This is expected — CSS (`hidden lg:block` / `lg:hidden`) controls which is visible in the browser.

- [ ] **Step 6: Commit**

```bash
git add src/pages/DashboardPage.tsx src/pages/DashboardPage.spec.tsx
git commit -m "feat: inbox list + split-view/bottom-sheet on Dashboard; remove JobCard (#9)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Browser verification

**Files:** none (manual verification).

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (note the localhost URL).

- [ ] **Step 2: Desktop split-view**

At a desktop width (≥ lg): confirm the compact list on the left and the empty detail panel ("Selecione uma vaga...") on the right. Click a row → the right panel fills with the job detail, the row highlights, the unread dot disappears (marked read), and no bottom sheet appears.

- [ ] **Step 3: Mobile bottom sheet**

Resize to a mobile width (< lg): confirm the list is full-width and the right panel is hidden. Click a row → the bottom sheet slides up from the bottom with the drag handle, backdrop dim/blur, and the job detail. Click the backdrop and press Escape → the sheet slides away.

- [ ] **Step 4: Pagination + truncation**

Confirm pagination still works (20/page) and that long titles/company names truncate to a single line per field.

---

## Self-Review

**Spec coverage:**

- Inbox rows (high-density, two-line, truncation, unread dot, read dimming) → Task 3. ✓
- Shared detail (full description, networking, actions) → Task 2. ✓
- Bottom sheet (backdrop blur, rounded-t, border, drag handle, slide-up, Escape/backdrop close) → Task 1. ✓
- Split-view (`lg:w-2/5` list + `lg:w-3/5` sticky panel, dynamic update) → Task 4. ✓
- Auto-mark read on open → Task 4 `handleSelect`. ✓
- Pagination kept → Task 4. ✓
- Selection cleared on filter change → Task 4 `useEffect([filters])`. ✓
- Zero dependencies → all tasks use React state + Tailwind only. ✓
- Browser validation of both modes → Task 5. ✓

**Placeholder scan:** none — every code step contains full source.

**Type consistency:** `JobRow`/`JobDetail`/`BottomSheet` prop names and the `handleSelect(job: Job)` / `onSelect(job)` / `open`/`onClose` signatures match across Tasks 1–4. `useToggleJobRead().mutate({ id, read })` and `useUpdateJobStatus().mutate({ id, status })` match the existing hooks.
