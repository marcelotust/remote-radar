# Páginas e navegação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar o app em cinco rotas (Home, Inbox, Empresas, Fontes, Settings) com um layout compartilhado e NavBar com item ativo.

**Architecture:** Introduzir um layout route (`Layout` = `NavBar` + `<Outlet/>` + wrapper) e rotas aninhadas em `App.tsx`. Os arquivos novos/renomeados são criados primeiro sem tocar em `App.tsx`, mantendo o app funcionando; a última task faz a integração das rotas e remove os arquivos antigos.

**Tech Stack:** React 18, react-router-dom, TanStack Query, Vitest + React Testing Library, Tailwind.

## Global Constraints

- TypeScript estrito; componentes funcionais com export nomeado (`export const X = ...`).
- Testes co-localizados: `Component/Component.spec.tsx` ao lado de `Component/Component.tsx`; páginas em `src/pages/`.
- Componentes que usam React Query devem ser envolvidos por `QueryClientProvider` com client novo por teste; `UIProvider` onde `useUIContext` for usado; `MemoryRouter` onde houver `NavLink`/`Link`.
- Estética: classes Tailwind do projeto (`bg-brand-bg`, `text-brand-green`, `bg-brand-surface`, `rounded-2xl`/`rounded-3xl`, `border-brand-green/20`).
- Textos da UI em português, como no código existente.
- Rodar testes com `npx vitest run <arquivo>`; lint com `npm run lint`.
- Data de referência do projeto: hoje é 2026-06-23.

---

### Task 1: `inboxFilters` (rename de `dashboardFilters`)

**Files:**

- Create: `src/pages/inboxFilters.ts`
- Test: `src/pages/inboxFilters.spec.ts`

**Interfaces:**

- Produces: `applyFilters(jobs: Job[], filters: FilterState): Job[]` — mesma assinatura/lógica de `dashboardFilters.applyFilters`.

> Nota: `src/pages/dashboardFilters.ts` e `.spec.ts` ainda existem e seguem em uso por `DashboardPage` até a Task 9. Aqui apenas adicionamos a versão renomeada.

- [ ] **Step 1: Criar o arquivo de filtros**

`src/pages/inboxFilters.ts`:

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

- [ ] **Step 2: Escrever o teste**

`src/pages/inboxFilters.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { applyFilters } from './inboxFilters'
import type { Job, FilterState } from '../types'

const base: FilterState = {
  status: 'all',
  relevance: 'all',
  wishlistOnly: false,
  unreadOnly: false,
}

const job = (over: Partial<Job>): Job => ({
  id: '1',
  title: 't',
  company: 'c',
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

describe('applyFilters (inbox)', () => {
  it('hides dismissed jobs when status is "all"', () => {
    const jobs = [job({ id: 'a' }), job({ id: 'b', status: 'dismissed' })]
    expect(applyFilters(jobs, base).map((j) => j.id)).toEqual(['a'])
  })

  it('filters by relevance level', () => {
    const jobs = [
      job({ id: 'a', relevance_level: 'high' }),
      job({ id: 'b', relevance_level: 'low' }),
    ]
    expect(applyFilters(jobs, { ...base, relevance: 'high' }).map((j) => j.id)).toEqual(['a'])
  })

  it('respects wishlistOnly and unreadOnly', () => {
    const jobs = [
      job({ id: 'a', is_wishlist_company: true, read: false }),
      job({ id: 'b', is_wishlist_company: false, read: false }),
      job({ id: 'c', is_wishlist_company: true, read: true }),
    ]
    expect(
      applyFilters(jobs, { ...base, wishlistOnly: true, unreadOnly: true }).map((j) => j.id)
    ).toEqual(['a'])
  })
})
```

- [ ] **Step 3: Rodar os testes**

Run: `npx vitest run src/pages/inboxFilters.spec.ts`
Expected: PASS (3 testes).

- [ ] **Step 4: Commit**

```bash
git add src/pages/inboxFilters.ts src/pages/inboxFilters.spec.ts
git commit -m "feat: add inboxFilters (rename of dashboardFilters) (#19)"
```

---

### Task 2: `Layout` component

**Files:**

- Create: `src/components/Layout/Layout.tsx`
- Test: `src/components/Layout/Layout.spec.tsx`

**Interfaces:**

- Consumes: `NavBar` de `../NavBar/NavBar`; `Outlet` de `react-router-dom`.
- Produces: `Layout` — componente sem props; renderiza `NavBar` + `<Outlet/>` dentro do wrapper `min-h-screen bg-brand-bg text-white`.

- [ ] **Step 1: Escrever o teste (falha)**

`src/components/Layout/Layout.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Layout } from './Layout'

describe('Layout', () => {
  it('renders the NavBar and the routed child via Outlet', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<p>child content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
    expect(screen.getByText('child content')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run src/components/Layout/Layout.spec.tsx`
Expected: FAIL (`Layout` não existe).

- [ ] **Step 3: Implementar o `Layout`**

`src/components/Layout/Layout.tsx`:

```tsx
import { Outlet } from 'react-router-dom'
import { NavBar } from '../NavBar/NavBar'

export const Layout = () => (
  <div className="min-h-screen bg-brand-bg text-white">
    <NavBar />
    <Outlet />
  </div>
)
```

- [ ] **Step 4: Rodar e confirmar PASS**

Run: `npx vitest run src/components/Layout/Layout.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout/Layout.tsx src/components/Layout/Layout.spec.tsx
git commit -m "feat: add shared Layout (NavBar + Outlet) (#19)"
```

---

### Task 3: NavBar com cinco links + item ativo

**Files:**

- Modify: `src/components/NavBar/NavBar.tsx`
- Test: `src/components/NavBar/NavBar.spec.tsx` (criar se não existir)

**Interfaces:**

- Produces: `NavBar` com `NavLink`s para `/`, `/inbox`, `/companies`, `/scraping-sources`, `/settings`.

> Os links apontam para rotas que só serão registradas na Task 9; até lá clicar redireciona para `/` (rota `*`). Isso é inofensivo.

- [ ] **Step 1: Escrever o teste (falha)**

`src/components/NavBar/NavBar.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { NavBar } from './NavBar'

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavBar />
    </MemoryRouter>
  )

describe('NavBar', () => {
  it('renders all five navigation links', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Empresas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fontes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
  })

  it('marks the active link with the brand-green class', () => {
    renderAt('/companies')
    expect(screen.getByRole('link', { name: 'Empresas' }).className).toContain('text-brand-green')
    expect(screen.getByRole('link', { name: 'Home' }).className).not.toContain('text-brand-green')
  })

  it('marks Home active only on the exact root path', () => {
    renderAt('/inbox')
    expect(screen.getByRole('link', { name: 'Home' }).className).not.toContain('text-brand-green')
    expect(screen.getByRole('link', { name: 'Inbox' }).className).toContain('text-brand-green')
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run src/components/NavBar/NavBar.spec.tsx`
Expected: FAIL (links Home/Inbox/Empresas/Fontes/Settings ainda não existem).

- [ ] **Step 3: Implementar a NavBar**

Substituir todo o conteúdo de `src/components/NavBar/NavBar.tsx` por:

```tsx
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/inbox', label: 'Inbox', end: false },
  { to: '/companies', label: 'Empresas', end: false },
  { to: '/scraping-sources', label: 'Fontes', end: false },
  { to: '/settings', label: 'Settings', end: false },
]

export const NavBar = () => (
  <nav className="flex flex-wrap items-center gap-6 px-6 py-4 bg-brand-bg border-b border-brand-gray/20">
    <span className="text-white font-bold text-lg tracking-tight">Remote Radar</span>
    {links.map(({ to, label, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        className={({ isActive }) =>
          `text-sm font-medium transition-all duration-300 ${isActive ? 'text-brand-green' : 'text-gray-400 hover:text-white'}`
        }
      >
        {label}
      </NavLink>
    ))}
  </nav>
)
```

- [ ] **Step 4: Rodar e confirmar PASS**

Run: `npx vitest run src/components/NavBar/NavBar.spec.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/NavBar/NavBar.tsx src/components/NavBar/NavBar.spec.tsx
git commit -m "feat: NavBar with five links + active state (#19)"
```

---

### Task 4: `InboxPage` (conteúdo do feed, sem NavBar/wrapper)

**Files:**

- Create: `src/pages/InboxPage.tsx`
- Test: `src/pages/InboxPage.spec.tsx`

**Interfaces:**

- Consumes: `applyFilters` de `./inboxFilters`; `useJobs`, `useToggleJobRead`, `useUIContext`, `paginate`, `FilterBar`, `JobRow`, `JobDetail`, `BottomSheet`.
- Produces: `InboxPage` — renderiza `FilterBar` + lista paginada + split-view + `BottomSheet`, sem `NavBar` nem wrapper externo (esses vêm do `Layout`).

> `DashboardPage.tsx` continua existindo até a Task 9. Aqui criamos `InboxPage` em paralelo.

- [ ] **Step 1: Implementar a `InboxPage`**

`src/pages/InboxPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { FilterBar } from '../components/FilterBar/FilterBar'
import { JobRow } from '../components/JobRow/JobRow'
import { JobDetail } from '../components/JobDetail/JobDetail'
import { BottomSheet } from '../components/BottomSheet/BottomSheet'
import { useJobs } from '../hooks/useJobs'
import { useToggleJobRead } from '../hooks/useToggleJobRead'
import { useUIContext } from '../contexts/UIContext'
import { applyFilters } from './inboxFilters'
import { paginate } from '../utils/paginate'
import type { Job } from '../types'

const pageButtonClass =
  'rounded-2xl border-2 border-brand-gray/30 px-3 py-1 transition-all duration-300 hover:border-brand-green/60 hover:text-brand-green disabled:opacity-40 disabled:hover:border-brand-gray/30 disabled:hover:text-gray-400'

export const InboxPage = () => {
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

  const [sheetJob, setSheetJob] = useState<Job | null>(null)
  useEffect(() => {
    if (selectedJob) setSheetJob(selectedJob)
  }, [selectedJob])

  const handleSelect = (job: Job) => {
    setSelectedId(job.id)
    if (!job.read) toggleRead({ id: job.id, read: true })
  }

  return (
    <>
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
        {sheetJob && <JobDetail job={sheetJob} />}
      </BottomSheet>
    </>
  )
}
```

- [ ] **Step 2: Escrever o teste**

`src/pages/InboxPage.spec.tsx` (porta os casos do `DashboardPage.spec.tsx`; sem o teste "renders NavBar" pois a NavBar agora vive no Layout):

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../contexts/UIContext'
import { InboxPage } from './InboxPage'
import userEvent from '@testing-library/user-event'
import { supabase } from '../lib/supabase'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <UIProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </UIProvider>
    </QueryClientProvider>
  )
}

describe('InboxPage', () => {
  it('renders FilterBar', () => {
    render(<InboxPage />, { wrapper: makeWrapper() })
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('renders job rows from mock data', async () => {
    render(<InboxPage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    })
  })

  it('does not show pagination controls when there is a single page', async () => {
    render(<InboxPage />, { wrapper: makeWrapper() })
    await waitFor(() => expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /próxima/i })).not.toBeInTheDocument()
  })

  it('paginates and resets to page 1 when a filter changes', async () => {
    for (let i = 0; i < 60; i++) {
      await supabase.from('jobs').insert({
        title: `Seeded Role ${i}`,
        company: 'Seed Co',
        url: `https://seed/${i}`,
        location: null,
        description: null,
        posted_at: null,
        scraped_at: '2026-06-01T00:00:00Z',
        status: 'none',
        read: false,
        source_url: null,
      })
    }
    render(<InboxPage />, { wrapper: makeWrapper() })
    await waitFor(() => expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /próxima/i }))
    expect(screen.getByText(/Página 2 de 2/)).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText(/não lidas/i))
    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled()
  })

  it('opens a job detail and marks it read when a row is selected', async () => {
    render(<InboxPage />, { wrapper: makeWrapper() })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /senior frontend engineer/i })).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: /senior frontend engineer/i }))
    await waitFor(() =>
      expect(
        screen.getAllByRole('button', { name: /marcar como não lida/i }).length
      ).toBeGreaterThan(0)
    )
  })

  it('keeps the sheet detail mounted through the close animation', async () => {
    render(<InboxPage />, { wrapper: makeWrapper() })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /senior frontend engineer/i })).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: /senior frontend engineer/i }))
    await userEvent.click(screen.getByRole('button', { name: /fechar detalhes/i }))
    expect(
      screen.getAllByRole('heading', { name: /senior frontend engineer/i }).length
    ).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Rodar e confirmar PASS**

Run: `npx vitest run src/pages/InboxPage.spec.tsx`
Expected: PASS (6 testes).

- [ ] **Step 4: Commit**

```bash
git add src/pages/InboxPage.tsx src/pages/InboxPage.spec.tsx
git commit -m "feat: InboxPage (feed content without NavBar/wrapper) (#19)"
```

---

### Task 5: `CompaniesPage`

**Files:**

- Create: `src/pages/CompaniesPage.tsx`
- Test: `src/pages/CompaniesPage.spec.tsx`

**Interfaces:**

- Consumes: `useCompanies`, `useUIContext` (`setCompanyModalOpen`), `CompanyCard`, `AddCompanyModal`.
- Produces: `CompaniesPage` — lista de empresas full-width + botão "Adicionar empresa" + `AddCompanyModal`.

- [ ] **Step 1: Implementar a página**

`src/pages/CompaniesPage.tsx`:

```tsx
import { CompanyCard } from '../components/CompanyCard/CompanyCard'
import { AddCompanyModal } from '../components/AddCompanyModal/AddCompanyModal'
import { useCompanies } from '../hooks/useCompanies'
import { useUIContext } from '../contexts/UIContext'

export const CompaniesPage = () => {
  const { data: companies = [] } = useCompanies()
  const { setCompanyModalOpen } = useUIContext()

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Empresas</h2>
          <button
            onClick={() => setCompanyModalOpen(true)}
            aria-label="Adicionar empresa"
            className="px-4 py-1.5 text-sm bg-brand-green text-black font-medium rounded-2xl hover:shadow-neon-active transition-all duration-300"
          >
            + Adicionar empresa
          </button>
        </div>
        {companies.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </main>

      <AddCompanyModal />
    </>
  )
}
```

- [ ] **Step 2: Escrever o teste**

`src/pages/CompaniesPage.spec.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../contexts/UIContext'
import { CompaniesPage } from './CompaniesPage'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <UIProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </UIProvider>
    </QueryClientProvider>
  )
}

describe('CompaniesPage', () => {
  it('renders company cards from mock data', async () => {
    render(<CompaniesPage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument()
    })
  })

  it('has an Add Company button', () => {
    render(<CompaniesPage />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /adicionar empresa/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Rodar e confirmar PASS**

Run: `npx vitest run src/pages/CompaniesPage.spec.tsx`
Expected: PASS (2 testes).

- [ ] **Step 4: Commit**

```bash
git add src/pages/CompaniesPage.tsx src/pages/CompaniesPage.spec.tsx
git commit -m "feat: CompaniesPage (#19)"
```

---

### Task 6: `ScrapingSourcesPage`

**Files:**

- Create: `src/pages/ScrapingSourcesPage.tsx`
- Test: `src/pages/ScrapingSourcesPage.spec.tsx`

**Interfaces:**

- Consumes: `useSources`, `useUIContext` (`setSourceModalOpen`), `SourceCard`, `RunScraperButton`, `AddSourceModal`.
- Produces: `ScrapingSourcesPage` — lista de fontes full-width + `RunScraperButton` + botão "Adicionar fonte" + `AddSourceModal`.

- [ ] **Step 1: Implementar a página**

`src/pages/ScrapingSourcesPage.tsx`:

```tsx
import { SourceCard } from '../components/SourceCard/SourceCard'
import { AddSourceModal } from '../components/AddSourceModal/AddSourceModal'
import { RunScraperButton } from '../components/RunScraperButton/RunScraperButton'
import { useSources } from '../hooks/useSources'
import { useUIContext } from '../contexts/UIContext'

export const ScrapingSourcesPage = () => {
  const { data: sources = [] } = useSources()
  const { setSourceModalOpen } = useUIContext()

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Fontes de scraping</h2>
          <div className="flex items-center gap-2">
            <RunScraperButton />
            <button
              onClick={() => setSourceModalOpen(true)}
              aria-label="Adicionar fonte"
              className="px-4 py-1.5 text-sm bg-brand-green text-black font-medium rounded-2xl hover:shadow-neon-active transition-all duration-300"
            >
              + Adicionar fonte
            </button>
          </div>
        </div>
        {sources.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </main>

      <AddSourceModal />
    </>
  )
}
```

- [ ] **Step 2: Escrever o teste**

`src/pages/ScrapingSourcesPage.spec.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../contexts/UIContext'
import { ScrapingSourcesPage } from './ScrapingSourcesPage'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <UIProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </UIProvider>
    </QueryClientProvider>
  )
}

describe('ScrapingSourcesPage', () => {
  it('renders source cards from mock data', async () => {
    render(<ScrapingSourcesPage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Lever Jobs')).toBeInTheDocument()
    })
  })

  it('has an Add Source button', () => {
    render(<ScrapingSourcesPage />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /adicionar fonte/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Rodar e confirmar PASS**

Run: `npx vitest run src/pages/ScrapingSourcesPage.spec.tsx`
Expected: PASS (2 testes).

- [ ] **Step 4: Commit**

```bash
git add src/pages/ScrapingSourcesPage.tsx src/pages/ScrapingSourcesPage.spec.tsx
git commit -m "feat: ScrapingSourcesPage (#19)"
```

---

### Task 7: `HomePage` (resumo + destaques)

**Files:**

- Create: `src/pages/HomePage.tsx`
- Test: `src/pages/HomePage.spec.tsx`

**Interfaces:**

- Consumes: `useJobs`, `Link` de `react-router-dom`.
- Produces: `HomePage` — dois contadores (vagas novas no último dia via `scraped_at` < 24h; total não lidas via `read === false`) + lista de destaques (top 5 por `relevance_score` desc) com `Link` para `/inbox`.

- [ ] **Step 1: Implementar a página**

`src/pages/HomePage.tsx`:

```tsx
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useJobs } from '../hooks/useJobs'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export const HomePage = () => {
  const { data: jobs = [] } = useJobs()

  const newLastDay = useMemo(() => {
    const cutoff = Date.now() - ONE_DAY_MS
    return jobs.filter((j) => new Date(j.scraped_at).getTime() >= cutoff).length
  }, [jobs])

  const unreadCount = useMemo(() => jobs.filter((j) => !j.read).length, [jobs])

  const highlights = useMemo(
    () => [...jobs].sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0)).slice(0, 5),
    [jobs]
  )

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-8">
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6">
          <p className="text-3xl font-bold text-brand-green">{newLastDay}</p>
          <p className="text-sm text-gray-400">Vagas novas no último dia</p>
        </div>
        <div className="rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6">
          <p className="text-3xl font-bold text-brand-green">{unreadCount}</p>
          <p className="text-sm text-gray-400">Vagas não lidas</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Destaques</h2>
          <Link to="/inbox" className="text-sm text-brand-green hover:underline">
            Ver inbox
          </Link>
        </div>
        {highlights.length === 0 && <p className="text-sm text-gray-500">Nenhuma vaga ainda.</p>}
        {highlights.map((job) => (
          <Link
            key={job.id}
            to="/inbox"
            className="rounded-2xl border-2 border-brand-gray/30 px-4 py-3 transition-all duration-300 hover:border-brand-green/60"
          >
            <p className="text-white font-medium text-sm">{job.title}</p>
            <p className="text-xs text-gray-400">{job.company}</p>
          </Link>
        ))}
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Escrever o teste**

`src/pages/HomePage.spec.tsx` (semeia uma vaga recente para validar o contador "último dia"):

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { HomePage } from './HomePage'
import { supabase } from '../lib/supabase'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('HomePage', () => {
  it('shows the summary labels and highlights with a link to the inbox', async () => {
    render(<HomePage />, { wrapper: makeWrapper() })
    expect(screen.getByText(/vagas novas no último dia/i)).toBeInTheDocument()
    expect(screen.getByText(/vagas não lidas/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /ver inbox/i })).toHaveAttribute('href', '/inbox')
  })

  it('counts a job scraped within the last 24h', async () => {
    await supabase.from('jobs').insert({
      title: 'Fresh Role',
      company: 'Fresh Co',
      url: 'https://fresh/1',
      location: null,
      description: null,
      posted_at: null,
      scraped_at: new Date().toISOString(),
      status: 'none',
      read: false,
      source_url: null,
    })
    render(<HomePage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      const card = screen.getByText(/vagas novas no último dia/i).closest('div') as HTMLElement
      expect(Number(card.querySelector('p')?.textContent)).toBeGreaterThanOrEqual(1)
    })
  })
})
```

- [ ] **Step 3: Rodar e confirmar PASS**

Run: `npx vitest run src/pages/HomePage.spec.tsx`
Expected: PASS (2 testes).

- [ ] **Step 4: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.spec.tsx
git commit -m "feat: HomePage with summary counters + highlights (#19)"
```

---

### Task 8: `SettingsPage` (shell estrutural)

**Files:**

- Create: `src/pages/SettingsPage.tsx`
- Test: `src/pages/SettingsPage.spec.tsx`

**Interfaces:**

- Produces: `SettingsPage` — duas seções ("Cálculo de score" e "Tema") com controles inertes e nota de dependência de #43/#44. Sem hooks de dados.

- [ ] **Step 1: Implementar a página**

`src/pages/SettingsPage.tsx`:

```tsx
export const SettingsPage = () => (
  <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-8">
    <section className="rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6 flex flex-col gap-3">
      <h2 className="text-white font-semibold text-base">Cálculo de score</h2>
      <p className="text-sm text-gray-400">
        Edição das palavras-chave positivas e negativas. Em breve (#43).
      </p>
      <textarea
        disabled
        aria-label="Palavras-chave positivas"
        placeholder="Palavras-chave positivas"
        className="rounded-2xl border-2 border-brand-gray/30 bg-transparent px-4 py-2 text-sm text-gray-400 disabled:opacity-50"
      />
      <textarea
        disabled
        aria-label="Palavras-chave negativas"
        placeholder="Palavras-chave negativas"
        className="rounded-2xl border-2 border-brand-gray/30 bg-transparent px-4 py-2 text-sm text-gray-400 disabled:opacity-50"
      />
    </section>

    <section className="rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6 flex flex-col gap-3">
      <h2 className="text-white font-semibold text-base">Tema</h2>
      <p className="text-sm text-gray-400">Seletor de tema. Em breve (#44).</p>
      <fieldset disabled className="flex gap-4 text-sm text-gray-400">
        <label className="flex items-center gap-2">
          <input type="radio" name="theme" value="light" /> Claro
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="theme" value="dark" defaultChecked /> Escuro
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="theme" value="system" /> Sistema
        </label>
      </fieldset>
    </section>
  </main>
)
```

- [ ] **Step 2: Escrever o teste**

`src/pages/SettingsPage.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SettingsPage } from './SettingsPage'

describe('SettingsPage', () => {
  it('renders the score and theme sections', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('heading', { name: /cálculo de score/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /tema/i })).toBeInTheDocument()
  })

  it('shows an inert theme selector with three options', () => {
    render(<SettingsPage />)
    expect(screen.getByLabelText(/claro/i)).toBeDisabled()
    expect(screen.getByLabelText(/escuro/i)).toBeDisabled()
    expect(screen.getByLabelText(/sistema/i)).toBeDisabled()
  })
})
```

- [ ] **Step 3: Rodar e confirmar PASS**

Run: `npx vitest run src/pages/SettingsPage.spec.tsx`
Expected: PASS (2 testes).

- [ ] **Step 4: Commit**

```bash
git add src/pages/SettingsPage.tsx src/pages/SettingsPage.spec.tsx
git commit -m "feat: SettingsPage shell (score + theme placeholders) (#19)"
```

---

### Task 9: Wire `App.tsx` + limpeza dos arquivos antigos

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/App.spec.tsx`
- Delete: `src/pages/DashboardPage.tsx`, `src/pages/DashboardPage.spec.tsx`, `src/pages/dashboardFilters.ts`, `src/pages/dashboardFilters.spec.ts`, `src/pages/WishlistPage.tsx`, `src/pages/WishlistPage.spec.tsx`
- Test: `src/App.spec.tsx`

**Interfaces:**

- Consumes: `Layout`, `HomePage`, `InboxPage`, `CompaniesPage`, `ScrapingSourcesPage`, `SettingsPage`.
- Produces: `App` com rotas aninhadas sob `Layout` e redirect `/wishlist` → `/companies`.

- [ ] **Step 1: Reescrever `App.tsx`**

Substituir todo o conteúdo de `src/App.tsx` por:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from './contexts/UIContext'
import { Layout } from './components/Layout/Layout'
import { HomePage } from './pages/HomePage'
import { InboxPage } from './pages/InboxPage'
import { CompaniesPage } from './pages/CompaniesPage'
import { ScrapingSourcesPage } from './pages/ScrapingSourcesPage'
import { SettingsPage } from './pages/SettingsPage'

const queryClient = new QueryClient()

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <UIProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/scraping-sources" element={<ScrapingSourcesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/wishlist" element={<Navigate to="/companies" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UIProvider>
  </QueryClientProvider>
)
```

- [ ] **Step 2: Atualizar `App.spec.tsx`**

Substituir todo o conteúdo de `src/App.spec.tsx` por:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from './contexts/UIContext'
import { Layout } from './components/Layout/Layout'
import { HomePage } from './pages/HomePage'
import { CompaniesPage } from './pages/CompaniesPage'
import { App } from './App'

describe('App', () => {
  it('renders the NavBar and the Home summary at the root route', () => {
    render(<App />)
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
    expect(screen.getByText(/vagas novas no último dia/i)).toBeInTheDocument()
  })

  it('redirects /wishlist to /companies', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <UIProvider>
          <MemoryRouter initialEntries={['/wishlist']}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/companies" element={<CompaniesPage />} />
                <Route path="/wishlist" element={<Navigate to="/companies" replace />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </UIProvider>
      </QueryClientProvider>
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /adicionar empresa/i })).toBeInTheDocument()
    )
  })
})
```

- [ ] **Step 3: Apagar os arquivos antigos**

```bash
git rm src/pages/DashboardPage.tsx src/pages/DashboardPage.spec.tsx \
       src/pages/dashboardFilters.ts src/pages/dashboardFilters.spec.ts \
       src/pages/WishlistPage.tsx src/pages/WishlistPage.spec.tsx
```

- [ ] **Step 4: Rodar a suíte completa + type-check + lint**

Run: `npm run test:run && npm run build && npm run lint`
Expected: todos os testes passam; build (type-check) sem erros; lint limpo. Confirme que não restou nenhuma referência a `DashboardPage`/`WishlistPage`/`dashboardFilters` (grep abaixo deve não retornar nada):

Run: `grep -rn "DashboardPage\|WishlistPage\|dashboardFilters" src/`
Expected: sem resultados.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.spec.tsx
git commit -m "feat: wire nested routes under Layout, redirect /wishlist, remove old pages (#19)"
```

---

## Notas de verificação final

Após a Task 9, validar manualmente (`npm run dev`):

- `/` mostra os contadores e destaques; "Ver inbox" leva a `/inbox`.
- `/inbox` mostra o feed com FilterBar e split-view/bottom-sheet.
- `/companies` e `/scraping-sources` mostram suas listas, botões e modais funcionando.
- `/settings` mostra as duas seções (controles inertes).
- NavBar marca o item ativo em cada rota; `/wishlist` redireciona para `/companies`.
