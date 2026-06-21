# Remote Radar MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Remote Radar MVP — a dark-mode React SPA for browsing scraped remote job listings, managing a company wishlist, and managing scraping sources — using mock data throughout (no Supabase connection yet).

**Architecture:** TanStack Query manages all async/server state (jobs, companies, sources) with mock data in MVP; React Context holds UI state (filters, modals); components are co-located with their tests, one per file, enforced by ESLint.

**Tech Stack:** Vite, React 18, TypeScript (strict), Tailwind CSS v4, React Router DOM v6, TanStack Query v5, Vitest, React Testing Library, ESLint + Prettier, Husky + lint-staged.

## Global Constraints

- Arrow functions only for React components — no `function` keyword for components
- One React component per file (`react/no-multi-comp: error`)
- Max 250 lines per file (`max-lines: [error, 250]`, skipping blank lines/comments)
- Every `.ts`/`.tsx` file must have a co-located `.spec.ts`/`.spec.tsx` (except `src/types/index.ts`, `src/data/mockData.ts`, `src/utils/keywords.ts`, `src/main.tsx`)
- Vitest coverage gate: 80% lines and functions
- TypeScript strict mode on
- Project root: `/Users/marcelotust/Projetos/remote-radar`
- Dark-only MVP: use dark Tailwind color classes directly; no light/dark toggle

---

## File Map

| File                                                          | Role                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------- |
| `vite.config.ts`                                              | Build config + Tailwind v4 + React plugin                  |
| `vitest.config.ts`                                            | jsdom environment + RTL setup + coverage thresholds        |
| `src/test-setup.ts`                                           | Imports `@testing-library/jest-dom` matchers               |
| `eslint.config.js`                                            | Flat config: TS-ESLint + react/no-multi-comp + max-lines   |
| `.prettierrc`                                                 | Prettier options                                           |
| `.husky/pre-commit`                                           | Runs lint-staged                                           |
| `src/main.tsx`                                                | React entry point                                          |
| `src/App.tsx`                                                 | QueryClientProvider + UIProvider + BrowserRouter + Routes  |
| `src/index.css`                                               | `@import "tailwindcss"`                                    |
| `src/types/index.ts`                                          | All shared interfaces and union types                      |
| `src/utils/keywords.ts`                                       | Hardcoded `KEYWORD_CONFIG` constant                        |
| `src/utils/scoring.ts`                                        | `computeRelevanceScore` pure function                      |
| `src/utils/scoring.spec.ts`                                   | Tests for scoring                                          |
| `src/utils/dorkUrl.ts`                                        | `buildDorkUrl` pure function                               |
| `src/utils/dorkUrl.spec.ts`                                   | Tests for dorkUrl                                          |
| `src/data/mockData.ts`                                        | Seed arrays: `MOCK_JOBS`, `MOCK_COMPANIES`, `MOCK_SOURCES` |
| `src/contexts/UIContext.tsx`                                  | Filter state + modal state + `useUIContext` hook           |
| `src/contexts/UIContext.spec.tsx`                             | Tests for context                                          |
| `src/hooks/useJobs.ts`                                        | TanStack Query hook — fetches + enriches jobs              |
| `src/hooks/useJobs.spec.ts`                                   | Tests                                                      |
| `src/hooks/useUpdateJobStatus.ts`                             | Optimistic mutation for job status                         |
| `src/hooks/useUpdateJobStatus.spec.ts`                        | Tests                                                      |
| `src/hooks/useCompanies.ts`                                   | TanStack Query hook for companies list                     |
| `src/hooks/useCompanyMutations.ts`                            | add/edit/delete company mutations                          |
| `src/hooks/useCompanies.spec.ts`                              | Tests                                                      |
| `src/hooks/useSources.ts`                                     | TanStack Query hook for sources list                       |
| `src/hooks/useSourceMutations.ts`                             | add/edit/delete source mutations                           |
| `src/hooks/useSources.spec.ts`                                | Tests                                                      |
| `src/hooks/useNetworkingDork.ts`                              | Hook returning encoded dork URL                            |
| `src/hooks/useNetworkingDork.spec.ts`                         | Tests                                                      |
| `src/components/NavBar/NavBar.tsx`                            | Top navigation bar                                         |
| `src/components/NavBar/NavBar.spec.tsx`                       | Tests                                                      |
| `src/components/ScoreBadge/ScoreBadge.tsx`                    | Relevance level pill                                       |
| `src/components/ScoreBadge/ScoreBadge.spec.tsx`               | Tests                                                      |
| `src/components/RemoteBrazilBadge/RemoteBrazilBadge.tsx`      | Remote Brazil status pill                                  |
| `src/components/RemoteBrazilBadge/RemoteBrazilBadge.spec.tsx` | Tests                                                      |
| `src/components/StatusDropdown/StatusDropdown.tsx`            | Job status `<select>`                                      |
| `src/components/StatusDropdown/StatusDropdown.spec.tsx`       | Tests                                                      |
| `src/components/NetworkingButton/NetworkingButton.tsx`        | Opens dork URL in new tab                                  |
| `src/components/NetworkingButton/NetworkingButton.spec.tsx`   | Tests                                                      |
| `src/components/FilterBar/FilterBar.tsx`                      | Dashboard filter controls                                  |
| `src/components/FilterBar/FilterBar.spec.tsx`                 | Tests                                                      |
| `src/components/JobCard/JobCard.tsx`                          | Full job listing card                                      |
| `src/components/JobCard/JobCard.spec.tsx`                     | Tests                                                      |
| `src/components/CompanyCard/CompanyCard.tsx`                  | Wishlist company card                                      |
| `src/components/CompanyCard/CompanyCard.spec.tsx`             | Tests                                                      |
| `src/components/SourceCard/SourceCard.tsx`                    | Scraping source card                                       |
| `src/components/SourceCard/SourceCard.spec.tsx`               | Tests                                                      |
| `src/components/AddCompanyModal/AddCompanyModal.tsx`          | Add/edit company form modal                                |
| `src/components/AddCompanyModal/AddCompanyModal.spec.tsx`     | Tests                                                      |
| `src/components/AddSourceModal/AddSourceModal.tsx`            | Add/edit source form modal                                 |
| `src/components/AddSourceModal/AddSourceModal.spec.tsx`       | Tests                                                      |
| `src/pages/DashboardPage.tsx`                                 | Job feed page                                              |
| `src/pages/DashboardPage.spec.tsx`                            | Tests                                                      |
| `src/pages/WishlistPage.tsx`                                  | Companies + Sources page                                   |
| `src/pages/WishlistPage.spec.tsx`                             | Tests                                                      |

---

### Task 1: Project Scaffold + Tooling

**Files:**

- Create: all config files at project root
- Create: `src/test-setup.ts`, `src/index.css`
- Modify: `package.json` (scripts + lint-staged config)

**Interfaces:**

- Produces: working `npm run dev`, `npm test`, `npm run lint`

- [ ] **Step 1: Scaffold Vite project in existing directory**

```bash
cd /Users/marcelotust/Projetos/remote-radar
npm create vite@latest . -- --template react-ts
# When prompted about non-empty directory → select "Ignore files and continue"
npm install
```

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install react-router-dom @tanstack/react-query
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D \
  vitest @vitest/coverage-v8 \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  jsdom \
  eslint @eslint/js globals typescript-eslint \
  eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh \
  prettier eslint-config-prettier \
  husky lint-staged
```

- [ ] **Step 4: Delete Vite boilerplate**

```bash
rm -f src/App.css src/assets/react.svg public/vite.svg
# Clear src/App.tsx (keep file, will be replaced in Task 21)
```

- [ ] **Step 5: Write `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 6: Write `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/data/**',
        'src/types/**',
        'src/utils/keywords.ts',
        'src/**/*.spec.*',
      ],
      thresholds: { lines: 80, functions: 80 },
    },
  },
})
```

- [ ] **Step 7: Write `src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Write `src/index.css`**

```css
@import 'tailwindcss';
```

- [ ] **Step 9: Write `eslint.config.js`**

```javascript
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/no-multi-comp': 'error',
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
    },
    settings: { react: { version: 'detect' } },
  }
)
```

- [ ] **Step 10: Write `.prettierrc`**

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

- [ ] **Step 11: Update `package.json` scripts and lint-staged config**

Add to `"scripts"`:

```json
{
  "test": "vitest",
  "test:run": "vitest run",
  "coverage": "vitest run --coverage",
  "lint": "eslint .",
  "format": "prettier --write ."
}
```

Add at root level of `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

- [ ] **Step 12: Set up Husky**

```bash
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

- [ ] **Step 13: Write minimal `src/App.tsx` smoke test placeholder**

```tsx
export const App = () => <div data-testid="app">Remote Radar</div>
```

- [ ] **Step 14: Write `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 15: Write `tsconfig.json` strict mode**

Replace generated content:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "vitest.config.ts", "eslint.config.js"]
}
```

- [ ] **Step 16: Write a smoke test to verify the whole setup**

Create `src/App.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByTestId('app')).toBeInTheDocument()
  })
})
```

- [ ] **Step 17: Run the test suite and verify it passes**

```bash
npm run test:run
```

Expected output: `1 passed`

- [ ] **Step 18: Verify lint passes**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 19: Init git and commit**

```bash
git init
echo "node_modules\ndist\ncoverage\n.env" > .gitignore
git add -A
git commit -m "feat: scaffold Vite + React + TS + Tailwind + ESLint + Vitest"
```

---

### Task 2: TypeScript Types + Mock Data + Keywords

**Files:**

- Create: `src/types/index.ts`
- Create: `src/data/mockData.ts`
- Create: `src/utils/keywords.ts`

**Interfaces:**

- Produces: `Job`, `Company`, `ScrapingSource`, `KeywordConfig`, `JobStatus`, `RemoteBrazilStatus`, `RelevanceLevel` types used by all subsequent tasks

- [ ] **Step 1: Write `src/types/index.ts`**

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
  relevance_score?: number
  relevance_level?: RelevanceLevel
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

export type StatusFilter = 'all' | JobStatus
export type RelevanceFilter = 'all' | RelevanceLevel

export interface FilterState {
  status: StatusFilter
  relevance: RelevanceFilter
  wishlistOnly: boolean
}
```

- [ ] **Step 2: Write `src/utils/keywords.ts`**

```typescript
import type { KeywordConfig } from '../types'

export const KEYWORD_CONFIG: KeywordConfig = {
  positive: [
    'react',
    'frontend',
    'front-end',
    'typescript',
    'remote',
    'next.js',
    'nextjs',
    'vue',
    'tailwind',
    'node',
  ],
  negative: [
    'java',
    'presencial',
    'on-site',
    'onsite',
    'php',
    'cobol',
    '.net',
    'c#',
    'ruby',
    'golang',
  ],
}
```

- [ ] **Step 3: Write `src/data/mockData.ts`**

```typescript
import type { Job, Company, ScrapingSource } from '../types'

export const MOCK_COMPANIES: Company[] = [
  {
    id: 'c1',
    name: 'Stripe',
    website: 'https://stripe.com',
    notes: 'Strong eng culture, fully remote',
    remote_brazil: 'yes',
    created_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'c2',
    name: 'Cloudflare',
    website: 'https://cloudflare.com',
    notes: null,
    remote_brazil: 'unknown',
    created_at: '2026-06-05T00:00:00Z',
  },
  {
    id: 'c3',
    name: 'Acme Corp',
    website: null,
    notes: 'Only hires US-based',
    remote_brazil: 'no',
    created_at: '2026-06-10T00:00:00Z',
  },
]

export const MOCK_SOURCES: ScrapingSource[] = [
  {
    id: 's1',
    url: 'https://jobs.lever.co',
    label: 'Lever Jobs',
    is_active: true,
    created_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 's2',
    url: 'https://boards.greenhouse.io',
    label: 'Greenhouse',
    is_active: true,
    created_at: '2026-06-01T00:00:00Z',
  },
]

export const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    title: 'Senior Frontend Engineer',
    company: 'Stripe',
    url: 'https://stripe.com/jobs/1',
    location: 'Remote',
    description: 'We are looking for a React TypeScript engineer with Next.js experience.',
    posted_at: '2026-06-19T00:00:00Z',
    scraped_at: '2026-06-20T06:00:00Z',
    status: 'unseen',
    source_url: 'https://jobs.lever.co',
  },
  {
    id: 'j2',
    title: 'Full Stack Developer',
    company: 'Cloudflare',
    url: 'https://cloudflare.com/jobs/2',
    location: 'Remote',
    description: 'PHP and Java backend with some frontend work.',
    posted_at: '2026-06-18T00:00:00Z',
    scraped_at: '2026-06-20T06:00:00Z',
    status: 'unseen',
    source_url: 'https://boards.greenhouse.io',
  },
  {
    id: 'j3',
    title: 'React Developer',
    company: 'Tech Startup',
    url: 'https://techstartup.com/jobs/3',
    location: 'Presencial São Paulo',
    description: 'React frontend developer. Must work presencial.',
    posted_at: '2026-06-17T00:00:00Z',
    scraped_at: '2026-06-20T06:00:00Z',
    status: 'seen',
    source_url: 'https://jobs.lever.co',
  },
]
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/utils/keywords.ts src/data/mockData.ts
git commit -m "feat: add TypeScript types, keyword config, and mock data"
```

---

### Task 3: `scoring.ts` — Relevance Score Utility

**Files:**

- Create: `src/utils/scoring.ts`
- Create: `src/utils/scoring.spec.ts`

**Interfaces:**

- Consumes: `Job`, `KeywordConfig`, `RelevanceLevel` from `src/types/index.ts`
- Produces: `computeRelevanceScore(job, config): { score: number; level: RelevanceLevel }`

- [ ] **Step 1: Write failing tests**

Create `src/utils/scoring.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeRelevanceScore } from './scoring'
import type { KeywordConfig } from '../types'

const config: KeywordConfig = {
  positive: ['react', 'typescript', 'remote'],
  negative: ['php', 'presencial'],
}

describe('computeRelevanceScore', () => {
  it('returns high level when 3+ positive matches', () => {
    const job = { title: 'React Typescript Remote Dev', description: null }
    const { score, level } = computeRelevanceScore(job, config)
    expect(score).toBe(3)
    expect(level).toBe('high')
  })

  it('returns medium level when 1-2 positive matches', () => {
    const job = { title: 'React Developer', description: null }
    const { score, level } = computeRelevanceScore(job, config)
    expect(score).toBe(1)
    expect(level).toBe('medium')
  })

  it('returns low level when score is 0', () => {
    const job = { title: 'Backend Developer', description: null }
    const { score, level } = computeRelevanceScore(job, config)
    expect(score).toBe(0)
    expect(level).toBe('low')
  })

  it('returns negative level when negative keywords outweigh positive', () => {
    const job = { title: 'PHP Developer presencial', description: null }
    const { score, level } = computeRelevanceScore(job, config)
    expect(score).toBe(-2)
    expect(level).toBe('negative')
  })

  it('counts keywords from description as well as title', () => {
    const job = { title: 'Developer', description: 'Must know react and typescript' }
    const { score, level } = computeRelevanceScore(job, config)
    expect(score).toBe(2)
    expect(level).toBe('medium')
  })

  it('handles null description gracefully', () => {
    const job = { title: 'Developer', description: null }
    expect(() => computeRelevanceScore(job, config)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- scoring.spec
```

Expected: FAIL — `Cannot find module './scoring'`

- [ ] **Step 3: Implement `src/utils/scoring.ts`**

```typescript
import type { Job, KeywordConfig, RelevanceLevel } from '../types'

export const computeRelevanceScore = (
  job: Pick<Job, 'title' | 'description'>,
  config: KeywordConfig
): { score: number; level: RelevanceLevel } => {
  const text = `${job.title} ${job.description ?? ''}`.toLowerCase()

  const positiveMatches = config.positive.filter((kw) => text.includes(kw.toLowerCase()))
  const negativeMatches = config.negative.filter((kw) => text.includes(kw.toLowerCase()))

  const score = positiveMatches.length - negativeMatches.length

  const level: RelevanceLevel =
    score >= 3 ? 'high' : score >= 1 ? 'medium' : score === 0 ? 'low' : 'negative'

  return { score, level }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- scoring.spec
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/utils/scoring.ts src/utils/scoring.spec.ts
git commit -m "feat: add computeRelevanceScore utility (TDD)"
```

---

### Task 4: `dorkUrl.ts` — Google Dork URL Builder

**Files:**

- Create: `src/utils/dorkUrl.ts`
- Create: `src/utils/dorkUrl.spec.ts`

**Interfaces:**

- Produces: `buildDorkUrl(companyName: string): string`

- [ ] **Step 1: Write failing tests**

Create `src/utils/dorkUrl.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildDorkUrl } from './dorkUrl'

describe('buildDorkUrl', () => {
  it('returns a google.com search URL', () => {
    const url = buildDorkUrl('Stripe')
    expect(url).toMatch(/^https:\/\/www\.google\.com\/search\?q=/)
  })

  it('includes the company name in the query', () => {
    const url = buildDorkUrl('Stripe')
    expect(decodeURIComponent(url)).toContain('"Stripe"')
  })

  it('includes linkedin.com/in in the query', () => {
    const url = buildDorkUrl('Stripe')
    expect(decodeURIComponent(url)).toContain('site:linkedin.com/in')
  })

  it('includes Brasil in the query', () => {
    const url = buildDorkUrl('Stripe')
    expect(decodeURIComponent(url)).toContain('"Brasil"')
  })

  it('handles company names with special characters', () => {
    const url = buildDorkUrl('Acme & Co.')
    expect(url).not.toContain(' ')
    expect(url).toMatch(/^https:\/\/www\.google\.com\/search\?q=/)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- dorkUrl.spec
```

Expected: FAIL — `Cannot find module './dorkUrl'`

- [ ] **Step 3: Implement `src/utils/dorkUrl.ts`**

```typescript
export const buildDorkUrl = (companyName: string): string => {
  const query = `site:linkedin.com/in "${companyName}" ("Frontend" OR "Software Engineer" OR "Tech Recruiter") "Brasil"`
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
```

- [ ] **Step 4: Run to confirm pass**

```bash
npm run test:run -- dorkUrl.spec
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/utils/dorkUrl.ts src/utils/dorkUrl.spec.ts
git commit -m "feat: add buildDorkUrl utility (TDD)"
```

---

### Task 5: `UIContext` — UI State Management

**Files:**

- Create: `src/contexts/UIContext.tsx`
- Create: `src/contexts/UIContext.spec.tsx`

**Interfaces:**

- Consumes: `Company`, `ScrapingSource`, `FilterState`, `StatusFilter`, `RelevanceFilter` from `src/types/index.ts`
- Produces: `<UIProvider>`, `useUIContext()` returning `UIContextValue`

- [ ] **Step 1: Write failing tests**

Create `src/contexts/UIContext.spec.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { UIProvider, useUIContext } from './UIContext'

const TestConsumer = () => {
  const { filters, setFilters, companyModalOpen, setCompanyModalOpen } = useUIContext()
  return (
    <div>
      <span data-testid="status">{filters.status}</span>
      <span data-testid="modal">{String(companyModalOpen)}</span>
      <button onClick={() => setFilters({ status: 'applied' })}>set-status</button>
      <button onClick={() => setCompanyModalOpen(true)}>open-modal</button>
    </div>
  )
}

describe('UIContext', () => {
  it('provides default filter values', () => {
    render(
      <UIProvider>
        <TestConsumer />
      </UIProvider>
    )
    expect(screen.getByTestId('status').textContent).toBe('all')
  })

  it('updates filter state', async () => {
    render(
      <UIProvider>
        <TestConsumer />
      </UIProvider>
    )
    await userEvent.click(screen.getByText('set-status'))
    expect(screen.getByTestId('status').textContent).toBe('applied')
  })

  it('opens company modal', async () => {
    render(
      <UIProvider>
        <TestConsumer />
      </UIProvider>
    )
    expect(screen.getByTestId('modal').textContent).toBe('false')
    await userEvent.click(screen.getByText('open-modal'))
    expect(screen.getByTestId('modal').textContent).toBe('true')
  })

  it('throws when useUIContext is used outside UIProvider', () => {
    const consoleError = console.error
    console.error = () => {}
    expect(() => render(<TestConsumer />)).toThrow('useUIContext must be used within UIProvider')
    console.error = consoleError
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- UIContext.spec
```

Expected: FAIL — `Cannot find module './UIContext'`

- [ ] **Step 3: Implement `src/contexts/UIContext.tsx`**

```tsx
import { createContext, useContext, useState } from 'react'
import type { Company, ScrapingSource, FilterState } from '../types'

interface UIContextValue {
  filters: FilterState
  setFilters: (partial: Partial<FilterState>) => void
  companyModalOpen: boolean
  setCompanyModalOpen: (open: boolean) => void
  sourceModalOpen: boolean
  setSourceModalOpen: (open: boolean) => void
  editingCompany: Company | null
  setEditingCompany: (c: Company | null) => void
  editingSource: ScrapingSource | null
  setEditingSource: (s: ScrapingSource | null) => void
}

const UIContext = createContext<UIContextValue | null>(null)

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
  const [filters, setFiltersState] = useState<FilterState>({
    status: 'all',
    relevance: 'all',
    wishlistOnly: false,
  })
  const [companyModalOpen, setCompanyModalOpen] = useState(false)
  const [sourceModalOpen, setSourceModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editingSource, setEditingSource] = useState<ScrapingSource | null>(null)

  const setFilters = (partial: Partial<FilterState>) =>
    setFiltersState((prev) => ({ ...prev, ...partial }))

  return (
    <UIContext.Provider
      value={{
        filters,
        setFilters,
        companyModalOpen,
        setCompanyModalOpen,
        sourceModalOpen,
        setSourceModalOpen,
        editingCompany,
        setEditingCompany,
        editingSource,
        setEditingSource,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export const useUIContext = (): UIContextValue => {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUIContext must be used within UIProvider')
  return ctx
}
```

- [ ] **Step 4: Run to confirm pass**

```bash
npm run test:run -- UIContext.spec
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/contexts/UIContext.tsx src/contexts/UIContext.spec.tsx
git commit -m "feat: add UIContext with filter and modal state (TDD)"
```

---

### Task 6: `useNetworkingDork` Hook

**Files:**

- Create: `src/hooks/useNetworkingDork.ts`
- Create: `src/hooks/useNetworkingDork.spec.ts`

**Interfaces:**

- Consumes: `buildDorkUrl` from `src/utils/dorkUrl.ts`
- Produces: `useNetworkingDork(companyName: string): string`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useNetworkingDork.spec.ts`:

```typescript
import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useNetworkingDork } from './useNetworkingDork'

describe('useNetworkingDork', () => {
  it('returns a google search URL', () => {
    const { result } = renderHook(() => useNetworkingDork('Stripe'))
    expect(result.current).toMatch(/^https:\/\/www\.google\.com\/search/)
  })

  it('includes the company name', () => {
    const { result } = renderHook(() => useNetworkingDork('Stripe'))
    expect(decodeURIComponent(result.current)).toContain('"Stripe"')
  })

  it('updates when company name changes', () => {
    const { result, rerender } = renderHook(
      ({ name }: { name: string }) => useNetworkingDork(name),
      { initialProps: { name: 'Stripe' } }
    )
    rerender({ name: 'Cloudflare' })
    expect(decodeURIComponent(result.current)).toContain('"Cloudflare"')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- useNetworkingDork.spec
```

Expected: FAIL

- [ ] **Step 3: Implement `src/hooks/useNetworkingDork.ts`**

```typescript
import { useMemo } from 'react'
import { buildDorkUrl } from '../utils/dorkUrl'

export const useNetworkingDork = (companyName: string): string =>
  useMemo(() => buildDorkUrl(companyName), [companyName])
```

- [ ] **Step 4: Run to confirm pass**

```bash
npm run test:run -- useNetworkingDork.spec
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNetworkingDork.ts src/hooks/useNetworkingDork.spec.ts
git commit -m "feat: add useNetworkingDork hook (TDD)"
```

---

### Task 7: `useCompanies` + `useCompanyMutations` Hooks

**Files:**

- Create: `src/hooks/useCompanies.ts`
- Create: `src/hooks/useCompanyMutations.ts`
- Create: `src/hooks/useCompanies.spec.ts`

**Interfaces:**

- Consumes: `Company`, `RemoteBrazilStatus` from `src/types/index.ts`; `MOCK_COMPANIES` from `src/data/mockData.ts`
- Produces:
  - `useCompanies(): UseQueryResult<Company[]>`
  - `useAddCompany(): UseMutationResult<Company, Error, Omit<Company, 'id' | 'created_at'>>`
  - `useEditCompany(): UseMutationResult<Company, Error, Company>`
  - `useDeleteCompany(): UseMutationResult<void, Error, string>`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useCompanies.spec.ts`:

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { useCompanies } from './useCompanies'
import { useAddCompany, useDeleteCompany } from './useCompanyMutations'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useCompanies', () => {
  it('returns the mock companies list', async () => {
    const { result } = renderHook(() => useCompanies(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(3)
    expect(result.current.data?.[0].name).toBe('Stripe')
  })
})

describe('useAddCompany', () => {
  it('adds a company to the cache', async () => {
    const wrapper = makeWrapper()
    const { result: companiesResult } = renderHook(() => useCompanies(), { wrapper })
    await waitFor(() => expect(companiesResult.current.isSuccess).toBe(true))
    const initialLength = companiesResult.current.data!.length

    const { result: addResult } = renderHook(() => useAddCompany(), { wrapper })
    addResult.current.mutate({
      name: 'New Co',
      website: null,
      notes: null,
      remote_brazil: 'unknown',
    })

    await waitFor(() => expect(companiesResult.current.data!.length).toBe(initialLength + 1))
    expect(companiesResult.current.data?.some((c) => c.name === 'New Co')).toBe(true)
  })
})

describe('useDeleteCompany', () => {
  it('removes a company from the cache', async () => {
    const wrapper = makeWrapper()
    const { result: companiesResult } = renderHook(() => useCompanies(), { wrapper })
    await waitFor(() => expect(companiesResult.current.isSuccess).toBe(true))

    const { result: deleteResult } = renderHook(() => useDeleteCompany(), { wrapper })
    deleteResult.current.mutate('c1')

    await waitFor(() =>
      expect(companiesResult.current.data?.some((c) => c.id === 'c1')).toBe(false)
    )
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- useCompanies.spec
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/hooks/useCompanies.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { MOCK_COMPANIES } from '../data/mockData'
import type { Company } from '../types'

export const COMPANIES_KEY = ['companies'] as const

export const useCompanies = () =>
  useQuery<Company[]>({
    queryKey: COMPANIES_KEY,
    queryFn: async () => structuredClone(MOCK_COMPANIES),
  })
```

- [ ] **Step 4: Implement `src/hooks/useCompanyMutations.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { COMPANIES_KEY } from './useCompanies'
import type { Company } from '../types'

type NewCompany = Omit<Company, 'id' | 'created_at'>

export const useAddCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: NewCompany): Promise<Company> => ({
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }),
    onSuccess: (company) => {
      qc.setQueryData<Company[]>(COMPANIES_KEY, (old) => [...(old ?? []), company])
    },
  })
}

export const useEditCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (company: Company): Promise<Company> => company,
    onSuccess: (updated) => {
      qc.setQueryData<Company[]>(
        COMPANIES_KEY,
        (old) => old?.map((c) => (c.id === updated.id ? updated : c)) ?? []
      )
    },
  })
}

export const useDeleteCompany = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_id: string): Promise<void> => {},
    onSuccess: (_, id) => {
      qc.setQueryData<Company[]>(COMPANIES_KEY, (old) => old?.filter((c) => c.id !== id) ?? [])
    },
  })
}
```

- [ ] **Step 5: Run to confirm pass**

```bash
npm run test:run -- useCompanies.spec
```

Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useCompanies.ts src/hooks/useCompanyMutations.ts src/hooks/useCompanies.spec.ts
git commit -m "feat: add useCompanies and useCompanyMutations hooks (TDD)"
```

---

### Task 8: `useSources` + `useSourceMutations` Hooks

**Files:**

- Create: `src/hooks/useSources.ts`
- Create: `src/hooks/useSourceMutations.ts`
- Create: `src/hooks/useSources.spec.ts`

**Interfaces:**

- Consumes: `ScrapingSource` from `src/types/index.ts`; `MOCK_SOURCES` from `src/data/mockData.ts`
- Produces:
  - `useSources(): UseQueryResult<ScrapingSource[]>`
  - `useAddSource()`, `useEditSource()`, `useDeleteSource()`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useSources.spec.ts`:

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { useSources } from './useSources'
import { useAddSource, useDeleteSource } from './useSourceMutations'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useSources', () => {
  it('returns the mock sources list', async () => {
    const { result } = renderHook(() => useSources(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })
})

describe('useAddSource', () => {
  it('adds a source to the cache', async () => {
    const wrapper = makeWrapper()
    const { result: sourcesResult } = renderHook(() => useSources(), { wrapper })
    await waitFor(() => expect(sourcesResult.current.isSuccess).toBe(true))
    const initialLength = sourcesResult.current.data!.length

    const { result: addResult } = renderHook(() => useAddSource(), { wrapper })
    addResult.current.mutate({ url: 'https://example.com', label: 'Example', is_active: true })

    await waitFor(() => expect(sourcesResult.current.data!.length).toBe(initialLength + 1))
  })
})

describe('useDeleteSource', () => {
  it('removes a source from the cache', async () => {
    const wrapper = makeWrapper()
    const { result: sourcesResult } = renderHook(() => useSources(), { wrapper })
    await waitFor(() => expect(sourcesResult.current.isSuccess).toBe(true))

    const { result: deleteResult } = renderHook(() => useDeleteSource(), { wrapper })
    deleteResult.current.mutate('s1')

    await waitFor(() => expect(sourcesResult.current.data?.some((s) => s.id === 's1')).toBe(false))
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- useSources.spec
```

- [ ] **Step 3: Implement `src/hooks/useSources.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { MOCK_SOURCES } from '../data/mockData'
import type { ScrapingSource } from '../types'

export const SOURCES_KEY = ['sources'] as const

export const useSources = () =>
  useQuery<ScrapingSource[]>({
    queryKey: SOURCES_KEY,
    queryFn: async () => structuredClone(MOCK_SOURCES),
  })
```

- [ ] **Step 4: Implement `src/hooks/useSourceMutations.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SOURCES_KEY } from './useSources'
import type { ScrapingSource } from '../types'

type NewSource = Omit<ScrapingSource, 'id' | 'created_at'>

export const useAddSource = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: NewSource): Promise<ScrapingSource> => ({
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }),
    onSuccess: (source) => {
      qc.setQueryData<ScrapingSource[]>(SOURCES_KEY, (old) => [...(old ?? []), source])
    },
  })
}

export const useEditSource = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (source: ScrapingSource): Promise<ScrapingSource> => source,
    onSuccess: (updated) => {
      qc.setQueryData<ScrapingSource[]>(
        SOURCES_KEY,
        (old) => old?.map((s) => (s.id === updated.id ? updated : s)) ?? []
      )
    },
  })
}

export const useDeleteSource = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (_id: string): Promise<void> => {},
    onSuccess: (_, id) => {
      qc.setQueryData<ScrapingSource[]>(SOURCES_KEY, (old) => old?.filter((s) => s.id !== id) ?? [])
    },
  })
}
```

- [ ] **Step 5: Run to confirm pass**

```bash
npm run test:run -- useSources.spec
```

Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSources.ts src/hooks/useSourceMutations.ts src/hooks/useSources.spec.ts
git commit -m "feat: add useSources and useSourceMutations hooks (TDD)"
```

---

### Task 9: `useJobs` + `useUpdateJobStatus` Hooks

**Files:**

- Create: `src/hooks/useJobs.ts`
- Create: `src/hooks/useUpdateJobStatus.ts`
- Create: `src/hooks/useJobs.spec.ts`

**Interfaces:**

- Consumes: `Job`, `JobStatus` from `src/types`; `MOCK_JOBS` from `src/data/mockData.ts`; `computeRelevanceScore` from `src/utils/scoring.ts`; `KEYWORD_CONFIG` from `src/utils/keywords.ts`; `useCompanies` from `src/hooks/useCompanies.ts`
- Produces:
  - `useJobs(): UseQueryResult<Job[]>` — jobs enriched with `relevance_score`, `relevance_level`, `is_wishlist_company`, `wishlist_remote_brazil`, sorted by score desc
  - `useUpdateJobStatus(): UseMutationResult<...>`

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useJobs.spec.ts`:

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { useJobs } from './useJobs'
import { useUpdateJobStatus } from './useUpdateJobStatus'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useJobs', () => {
  it('returns enriched jobs with relevance_score', async () => {
    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const jobs = result.current.data!
    expect(jobs.length).toBe(3)
    jobs.forEach((j) => {
      expect(j.relevance_score).toBeDefined()
      expect(j.relevance_level).toBeDefined()
    })
  })

  it('marks stripe job as wishlist company', async () => {
    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const stripeJob = result.current.data!.find((j) => j.company === 'Stripe')
    expect(stripeJob?.is_wishlist_company).toBe(true)
    expect(stripeJob?.wishlist_remote_brazil).toBe('yes')
  })

  it('sorts jobs by relevance_score descending', async () => {
    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const scores = result.current.data!.map((j) => j.relevance_score ?? 0)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })
})

describe('useUpdateJobStatus', () => {
  it('optimistically updates job status in cache', async () => {
    const wrapper = makeWrapper()
    const { result: jobsResult } = renderHook(() => useJobs(), { wrapper })
    await waitFor(() => expect(jobsResult.current.isSuccess).toBe(true))

    const { result: mutResult } = renderHook(() => useUpdateJobStatus(), { wrapper })
    mutResult.current.mutate({ id: 'j1', status: 'applied' })

    await waitFor(() => {
      const updated = jobsResult.current.data?.find((j) => j.id === 'j1')
      expect(updated?.status).toBe('applied')
    })
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- useJobs.spec
```

- [ ] **Step 3: Implement `src/hooks/useJobs.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { MOCK_JOBS } from '../data/mockData'
import { computeRelevanceScore } from '../utils/scoring'
import { KEYWORD_CONFIG } from '../utils/keywords'
import { useCompanies } from './useCompanies'
import type { Job } from '../types'

export const JOBS_KEY = ['jobs'] as const

export const useJobs = () => {
  const { data: companies = [] } = useCompanies()
  const wishlistMap = new Map(companies.map((c) => [c.name.toLowerCase(), c]))

  return useQuery<Job[]>({
    queryKey: JOBS_KEY,
    queryFn: async () => structuredClone(MOCK_JOBS),
    select: (rawJobs) =>
      rawJobs
        .map((job) => {
          const { score, level } = computeRelevanceScore(job, KEYWORD_CONFIG)
          const wishlistCompany = wishlistMap.get(job.company.toLowerCase())
          return {
            ...job,
            relevance_score: score,
            relevance_level: level,
            is_wishlist_company: !!wishlistCompany,
            wishlist_remote_brazil: wishlistCompany?.remote_brazil,
          }
        })
        .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0)),
  })
}
```

- [ ] **Step 4: Implement `src/hooks/useUpdateJobStatus.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { JOBS_KEY } from './useJobs'
import type { Job, JobStatus } from '../types'

interface UpdatePayload {
  id: string
  status: JobStatus
}

export const useUpdateJobStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdatePayload): Promise<UpdatePayload> => payload,
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: JOBS_KEY })
      const previous = qc.getQueryData<Job[]>(JOBS_KEY)
      qc.setQueryData<Job[]>(
        JOBS_KEY,
        (old) => old?.map((j) => (j.id === id ? { ...j, status } : j)) ?? []
      )
      return { previous }
    },
    onError: (_, __, context) => {
      if (context?.previous) qc.setQueryData(JOBS_KEY, context.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: JOBS_KEY })
    },
  })
}
```

- [ ] **Step 5: Run to confirm pass**

```bash
npm run test:run -- useJobs.spec
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useJobs.ts src/hooks/useUpdateJobStatus.ts src/hooks/useJobs.spec.ts
git commit -m "feat: add useJobs and useUpdateJobStatus hooks (TDD)"
```

---

### Task 10: `NavBar` Component

**Files:**

- Create: `src/components/NavBar/NavBar.tsx`
- Create: `src/components/NavBar/NavBar.spec.tsx`

**Interfaces:**

- Consumes: React Router `<NavLink>`
- Produces: `<NavBar />` — no props

- [ ] **Step 1: Write failing tests**

Create `src/components/NavBar/NavBar.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { NavBar } from './NavBar'

const renderNavBar = () =>
  render(
    <MemoryRouter>
      <NavBar />
    </MemoryRouter>
  )

describe('NavBar', () => {
  it('renders the app name', () => {
    renderNavBar()
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
  })

  it('has a link to the dashboard', () => {
    renderNavBar()
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/')
  })

  it('has a link to wishlist', () => {
    renderNavBar()
    expect(screen.getByRole('link', { name: /wishlist/i })).toHaveAttribute('href', '/wishlist')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- NavBar.spec
```

- [ ] **Step 3: Implement `src/components/NavBar/NavBar.tsx`**

```tsx
import { NavLink } from 'react-router-dom'

export const NavBar = () => (
  <nav className="flex items-center gap-6 px-6 py-4 bg-gray-900 border-b border-gray-800">
    <span className="text-white font-bold text-lg tracking-tight">Remote Radar</span>
    <NavLink
      to="/"
      className={({ isActive }) =>
        `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
      }
    >
      Dashboard
    </NavLink>
    <NavLink
      to="/wishlist"
      className={({ isActive }) =>
        `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
      }
    >
      Wishlist
    </NavLink>
  </nav>
)
```

- [ ] **Step 4: Run to confirm pass**

```bash
npm run test:run -- NavBar.spec
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/NavBar/
git commit -m "feat: add NavBar component (TDD)"
```

---

### Task 11: `ScoreBadge` Component

**Files:**

- Create: `src/components/ScoreBadge/ScoreBadge.tsx`
- Create: `src/components/ScoreBadge/ScoreBadge.spec.tsx`

**Interfaces:**

- Consumes: `RelevanceLevel` from `src/types/index.ts`
- Produces: `<ScoreBadge level={RelevanceLevel} />`

- [ ] **Step 1: Write failing tests**

Create `src/components/ScoreBadge/ScoreBadge.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScoreBadge } from './ScoreBadge'

describe('ScoreBadge', () => {
  it('shows "Alta" for high level', () => {
    render(<ScoreBadge level="high" />)
    expect(screen.getByText('Alta')).toBeInTheDocument()
  })

  it('shows "Média" for medium level', () => {
    render(<ScoreBadge level="medium" />)
    expect(screen.getByText('Média')).toBeInTheDocument()
  })

  it('shows "Baixa" for low level', () => {
    render(<ScoreBadge level="low" />)
    expect(screen.getByText('Baixa')).toBeInTheDocument()
  })

  it('shows "Negativa" for negative level', () => {
    render(<ScoreBadge level="negative" />)
    expect(screen.getByText('Negativa')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- ScoreBadge.spec
```

- [ ] **Step 3: Implement `src/components/ScoreBadge/ScoreBadge.tsx`**

```tsx
import type { RelevanceLevel } from '../../types'

interface Props {
  level: RelevanceLevel
}

const LABEL: Record<RelevanceLevel, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
  negative: 'Negativa',
}

const COLOR: Record<RelevanceLevel, string> = {
  high: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-gray-500/20 text-gray-400',
  negative: 'bg-red-500/20 text-red-400',
}

export const ScoreBadge = ({ level }: Props) => (
  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${COLOR[level]}`}>
    {LABEL[level]}
  </span>
)
```

- [ ] **Step 4: Run to confirm pass**

```bash
npm run test:run -- ScoreBadge.spec
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ScoreBadge/
git commit -m "feat: add ScoreBadge component (TDD)"
```

---

### Task 12: `RemoteBrazilBadge` Component

**Files:**

- Create: `src/components/RemoteBrazilBadge/RemoteBrazilBadge.tsx`
- Create: `src/components/RemoteBrazilBadge/RemoteBrazilBadge.spec.tsx`

**Interfaces:**

- Consumes: `RemoteBrazilStatus` from `src/types/index.ts`
- Produces: `<RemoteBrazilBadge status={RemoteBrazilStatus} />`

- [ ] **Step 1: Write failing tests**

Create `src/components/RemoteBrazilBadge/RemoteBrazilBadge.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RemoteBrazilBadge } from './RemoteBrazilBadge'

describe('RemoteBrazilBadge', () => {
  it('shows green badge for "yes"', () => {
    render(<RemoteBrazilBadge status="yes" />)
    expect(screen.getByText('Remote Brasil ✓')).toBeInTheDocument()
  })

  it('shows gray badge for "unknown"', () => {
    render(<RemoteBrazilBadge status="unknown" />)
    expect(screen.getByText('Não confirmado')).toBeInTheDocument()
  })

  it('shows red badge for "no"', () => {
    render(<RemoteBrazilBadge status="no" />)
    expect(screen.getByText('Não contrata remoto')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- RemoteBrazilBadge.spec
```

- [ ] **Step 3: Implement `src/components/RemoteBrazilBadge/RemoteBrazilBadge.tsx`**

```tsx
import type { RemoteBrazilStatus } from '../../types'

interface Props {
  status: RemoteBrazilStatus
}

const LABEL: Record<RemoteBrazilStatus, string> = {
  yes: 'Remote Brasil ✓',
  unknown: 'Não confirmado',
  no: 'Não contrata remoto',
}

const COLOR: Record<RemoteBrazilStatus, string> = {
  yes: 'bg-green-500/20 text-green-400',
  unknown: 'bg-gray-500/20 text-gray-400',
  no: 'bg-red-500/20 text-red-400',
}

export const RemoteBrazilBadge = ({ status }: Props) => (
  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${COLOR[status]}`}>
    {LABEL[status]}
  </span>
)
```

- [ ] **Step 4: Run to confirm pass + commit**

```bash
npm run test:run -- RemoteBrazilBadge.spec
git add src/components/RemoteBrazilBadge/
git commit -m "feat: add RemoteBrazilBadge component (TDD)"
```

---

### Task 13: `StatusDropdown` Component

**Files:**

- Create: `src/components/StatusDropdown/StatusDropdown.tsx`
- Create: `src/components/StatusDropdown/StatusDropdown.spec.tsx`

**Interfaces:**

- Consumes: `JobStatus` from `src/types/index.ts`
- Produces: `<StatusDropdown value={JobStatus} onChange={(s: JobStatus) => void} />`

- [ ] **Step 1: Write failing tests**

Create `src/components/StatusDropdown/StatusDropdown.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StatusDropdown } from './StatusDropdown'

describe('StatusDropdown', () => {
  it('renders the current status as selected value', () => {
    render(<StatusDropdown value="applied" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveValue('applied')
  })

  it('calls onChange with new value when selection changes', async () => {
    const onChange = vi.fn()
    render(<StatusDropdown value="unseen" onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'seen')
    expect(onChange).toHaveBeenCalledWith('seen')
  })

  it('renders all four status options', () => {
    render(<StatusDropdown value="unseen" onChange={() => {}} />)
    expect(screen.getByRole('option', { name: /não visto/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /visto/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /candidatado/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /descartado/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- StatusDropdown.spec
```

- [ ] **Step 3: Implement `src/components/StatusDropdown/StatusDropdown.tsx`**

```tsx
import type { JobStatus } from '../../types'

interface Props {
  value: JobStatus
  onChange: (status: JobStatus) => void
}

const OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'unseen', label: 'Não visto' },
  { value: 'seen', label: 'Visto' },
  { value: 'applied', label: 'Candidatado' },
  { value: 'dismissed', label: 'Descartado' },
]

export const StatusDropdown = ({ value, onChange }: Props) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as JobStatus)}
    className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-600"
  >
    {OPTIONS.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
)
```

- [ ] **Step 4: Run to confirm pass + commit**

```bash
npm run test:run -- StatusDropdown.spec
git add src/components/StatusDropdown/
git commit -m "feat: add StatusDropdown component (TDD)"
```

---

### Task 14: `NetworkingButton` Component

**Files:**

- Create: `src/components/NetworkingButton/NetworkingButton.tsx`
- Create: `src/components/NetworkingButton/NetworkingButton.spec.tsx`

**Interfaces:**

- Consumes: `useNetworkingDork` from `src/hooks/useNetworkingDork.ts`
- Produces: `<NetworkingButton companyName={string} />`

- [ ] **Step 1: Write failing tests**

Create `src/components/NetworkingButton/NetworkingButton.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NetworkingButton } from './NetworkingButton'

describe('NetworkingButton', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn())
  })

  it('renders a button', () => {
    render(<NetworkingButton companyName="Stripe" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens a Google search URL in new tab when clicked', async () => {
    render(<NetworkingButton companyName="Stripe" />)
    await userEvent.click(screen.getByRole('button'))
    expect(window.open).toHaveBeenCalledWith(expect.stringMatching(/google\.com\/search/), '_blank')
  })

  it('includes company name in the URL', async () => {
    render(<NetworkingButton companyName="Cloudflare" />)
    await userEvent.click(screen.getByRole('button'))
    const url = (window.open as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(decodeURIComponent(url)).toContain('"Cloudflare"')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- NetworkingButton.spec
```

- [ ] **Step 3: Implement `src/components/NetworkingButton/NetworkingButton.tsx`**

```tsx
import { useNetworkingDork } from '../../hooks/useNetworkingDork'

interface Props {
  companyName: string
}

export const NetworkingButton = ({ companyName }: Props) => {
  const url = useNetworkingDork(companyName)

  return (
    <button
      onClick={() => window.open(url, '_blank')}
      title={`Buscar profissionais da ${companyName} no LinkedIn`}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
    >
      🔗 Networking
    </button>
  )
}
```

- [ ] **Step 4: Run to confirm pass + commit**

```bash
npm run test:run -- NetworkingButton.spec
git add src/components/NetworkingButton/
git commit -m "feat: add NetworkingButton component (TDD)"
```

---

### Task 15: `FilterBar` Component

**Files:**

- Create: `src/components/FilterBar/FilterBar.tsx`
- Create: `src/components/FilterBar/FilterBar.spec.tsx`

**Interfaces:**

- Consumes: `FilterState`, `StatusFilter`, `RelevanceFilter` from `src/types/index.ts`; `useUIContext` from `src/contexts/UIContext.tsx`
- Produces: `<FilterBar />` — reads and writes to UIContext

- [ ] **Step 1: Write failing tests**

Create `src/components/FilterBar/FilterBar.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../../contexts/UIContext'
import { FilterBar } from './FilterBar'

const renderFilterBar = () =>
  render(
    <UIProvider>
      <FilterBar />
    </UIProvider>
  )

describe('FilterBar', () => {
  it('renders status filter select', () => {
    renderFilterBar()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('renders relevance filter select', () => {
    renderFilterBar()
    expect(screen.getByLabelText(/relevância/i)).toBeInTheDocument()
  })

  it('renders wishlist only toggle', () => {
    renderFilterBar()
    expect(screen.getByLabelText(/wishlist/i)).toBeInTheDocument()
  })

  it('updates context when status filter changes', async () => {
    renderFilterBar()
    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'applied')
    expect(screen.getByLabelText(/status/i)).toHaveValue('applied')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- FilterBar.spec
```

- [ ] **Step 3: Implement `src/components/FilterBar/FilterBar.tsx`**

```tsx
import { useUIContext } from '../../contexts/UIContext'
import type { StatusFilter, RelevanceFilter } from '../../types'

export const FilterBar = () => {
  const { filters, setFilters } = useUIContext()

  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-gray-900 border-b border-gray-800">
      <label className="flex items-center gap-2 text-sm text-gray-400">
        Status
        <select
          aria-label="Status"
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value as StatusFilter })}
          className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-700"
        >
          <option value="all">Todos</option>
          <option value="unseen">Não visto</option>
          <option value="seen">Visto</option>
          <option value="applied">Candidatado</option>
          <option value="dismissed">Descartado</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-400">
        Relevância
        <select
          aria-label="Relevância"
          value={filters.relevance}
          onChange={(e) => setFilters({ relevance: e.target.value as RelevanceFilter })}
          className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-700"
        >
          <option value="all">Todas</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
          <option value="negative">Negativa</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-400">
        <input
          type="checkbox"
          aria-label="Wishlist only"
          checked={filters.wishlistOnly}
          onChange={(e) => setFilters({ wishlistOnly: e.target.checked })}
          className="rounded border-gray-700"
        />
        Wishlist
      </label>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm pass + commit**

```bash
npm run test:run -- FilterBar.spec
git add src/components/FilterBar/
git commit -m "feat: add FilterBar component (TDD)"
```

---

### Task 16: `JobCard` Component

**Files:**

- Create: `src/components/JobCard/JobCard.tsx`
- Create: `src/components/JobCard/JobCard.spec.tsx`

**Interfaces:**

- Consumes: `Job` from `src/types/index.ts`; `ScoreBadge`, `RemoteBrazilBadge`, `StatusDropdown`, `NetworkingButton` components; `useUpdateJobStatus` hook
- Produces: `<JobCard job={Job} />`

- [ ] **Step 1: Write failing tests**

Create `src/components/JobCard/JobCard.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { JobCard } from './JobCard'
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
  description: 'React TypeScript role',
  posted_at: '2026-06-19T00:00:00Z',
  scraped_at: '2026-06-20T06:00:00Z',
  status: 'unseen',
  source_url: null,
  relevance_score: 3,
  relevance_level: 'high',
  is_wishlist_company: true,
  wishlist_remote_brazil: 'yes',
}

describe('JobCard', () => {
  it('renders the job title', () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
  })

  it('renders the company name', () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Stripe')).toBeInTheDocument()
  })

  it('shows RemoteBrazilBadge for wishlist companies', () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Remote Brasil ✓')).toBeInTheDocument()
  })

  it('hides RemoteBrazilBadge for non-wishlist companies', () => {
    const job = { ...baseJob, is_wishlist_company: false }
    render(<JobCard job={job} />, { wrapper: makeWrapper() })
    expect(screen.queryByText(/Remote Brasil/)).not.toBeInTheDocument()
  })

  it('renders a link to the original job posting', () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('link', { name: /ver vaga/i })).toHaveAttribute(
      'href',
      'https://stripe.com/jobs/1'
    )
  })

  it('renders the ScoreBadge', () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Alta')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- JobCard.spec
```

- [ ] **Step 3: Implement `src/components/JobCard/JobCard.tsx`**

```tsx
import { ScoreBadge } from '../ScoreBadge/ScoreBadge'
import { RemoteBrazilBadge } from '../RemoteBrazilBadge/RemoteBrazilBadge'
import { StatusDropdown } from '../StatusDropdown/StatusDropdown'
import { NetworkingButton } from '../NetworkingButton/NetworkingButton'
import { useUpdateJobStatus } from '../../hooks/useUpdateJobStatus'
import type { Job } from '../../types'

interface Props {
  job: Job
}

export const JobCard = ({ job }: Props) => {
  const { mutate: updateStatus } = useUpdateJobStatus()

  return (
    <article className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-3 hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-2 flex-wrap">
        {job.relevance_level && <ScoreBadge level={job.relevance_level} />}
        {job.is_wishlist_company && job.wishlist_remote_brazil && (
          <RemoteBrazilBadge status={job.wishlist_remote_brazil} />
        )}
        <div className="ml-auto">
          <StatusDropdown
            value={job.status}
            onChange={(status) => updateStatus({ id: job.id, status })}
          />
        </div>
      </div>

      <div>
        <h2 className="text-white font-semibold text-base leading-tight">{job.title}</h2>
        <p className="text-gray-400 text-sm mt-0.5">
          {job.company}
          {job.location && <span className="text-gray-600"> · {job.location}</span>}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Ver vaga
        </a>
        <NetworkingButton companyName={job.company} />
      </div>
    </article>
  )
}
```

- [ ] **Step 4: Run to confirm pass + commit**

```bash
npm run test:run -- JobCard.spec
git add src/components/JobCard/
git commit -m "feat: add JobCard component (TDD)"
```

---

### Task 17: `CompanyCard` Component

**Files:**

- Create: `src/components/CompanyCard/CompanyCard.tsx`
- Create: `src/components/CompanyCard/CompanyCard.spec.tsx`

**Interfaces:**

- Consumes: `Company` from `src/types`; `RemoteBrazilBadge`, `NetworkingButton`; `useEditCompany`, `useDeleteCompany` from `src/hooks/useCompanyMutations.ts`; `useUIContext` from `src/contexts/UIContext.tsx`
- Produces: `<CompanyCard company={Company} />`

- [ ] **Step 1: Write failing tests**

Create `src/components/CompanyCard/CompanyCard.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { UIProvider } from '../../contexts/UIContext'
import { CompanyCard } from './CompanyCard'
import type { Company } from '../../types'

const company: Company = {
  id: 'c1',
  name: 'Stripe',
  website: 'https://stripe.com',
  notes: 'Good culture',
  remote_brazil: 'yes',
  created_at: '2026-06-01T00:00:00Z',
}

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <UIProvider>{children}</UIProvider>
    </QueryClientProvider>
  )
}

describe('CompanyCard', () => {
  it('renders company name', () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Stripe')).toBeInTheDocument()
  })

  it('renders the remote brazil badge', () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Remote Brasil ✓')).toBeInTheDocument()
  })

  it('renders the website link', () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('link', { name: /stripe\.com/i })).toBeInTheDocument()
  })

  it('has a delete button', () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument()
  })

  it('has an edit button', () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- CompanyCard.spec
```

- [ ] **Step 3: Implement `src/components/CompanyCard/CompanyCard.tsx`**

```tsx
import { RemoteBrazilBadge } from '../RemoteBrazilBadge/RemoteBrazilBadge'
import { NetworkingButton } from '../NetworkingButton/NetworkingButton'
import { useDeleteCompany } from '../../hooks/useCompanyMutations'
import { useUIContext } from '../../contexts/UIContext'
import type { Company } from '../../types'

interface Props {
  company: Company
}

export const CompanyCard = ({ company }: Props) => {
  const { mutate: deleteCompany } = useDeleteCompany()
  const { setEditingCompany, setCompanyModalOpen } = useUIContext()

  const handleEdit = () => {
    setEditingCompany(company)
    setCompanyModalOpen(true)
  }

  return (
    <article className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-semibold">{company.name}</span>
          <RemoteBrazilBadge status={company.remote_brazil} />
        </div>
        <NetworkingButton companyName={company.name} />
      </div>

      {company.website && (
        <a
          href={company.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 underline truncate"
        >
          {company.website}
        </a>
      )}

      {company.notes && <p className="text-gray-500 text-xs">{company.notes}</p>}

      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={handleEdit}
          aria-label="Editar"
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Editar
        </button>
        <button
          onClick={() => deleteCompany(company.id)}
          aria-label="Excluir"
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Excluir
        </button>
      </div>
    </article>
  )
}
```

- [ ] **Step 4: Run to confirm pass + commit**

```bash
npm run test:run -- CompanyCard.spec
git add src/components/CompanyCard/
git commit -m "feat: add CompanyCard component (TDD)"
```

---

### Task 18: `SourceCard` Component

**Files:**

- Create: `src/components/SourceCard/SourceCard.tsx`
- Create: `src/components/SourceCard/SourceCard.spec.tsx`

**Interfaces:**

- Consumes: `ScrapingSource` from `src/types`; `useDeleteSource`, `useEditSource` from `src/hooks/useSourceMutations.ts`
- Produces: `<SourceCard source={ScrapingSource} />`

- [ ] **Step 1: Write failing tests**

Create `src/components/SourceCard/SourceCard.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { SourceCard } from './SourceCard'
import type { ScrapingSource } from '../../types'

const source: ScrapingSource = {
  id: 's1',
  label: 'Lever Jobs',
  url: 'https://jobs.lever.co',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
}

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('SourceCard', () => {
  it('renders the label', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Lever Jobs')).toBeInTheDocument()
  })

  it('renders the URL', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByText('https://jobs.lever.co')).toBeInTheDocument()
  })

  it('renders active toggle checked when is_active is true', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('has a delete button', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- SourceCard.spec
```

- [ ] **Step 3: Implement `src/components/SourceCard/SourceCard.tsx`**

```tsx
import { useDeleteSource, useEditSource } from '../../hooks/useSourceMutations'
import type { ScrapingSource } from '../../types'

interface Props {
  source: ScrapingSource
}

export const SourceCard = ({ source }: Props) => {
  const { mutate: deleteSource } = useDeleteSource()
  const { mutate: editSource } = useEditSource()

  return (
    <article className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-white font-semibold text-sm">{source.label}</span>
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={source.is_active}
            onChange={(e) => editSource({ ...source, is_active: e.target.checked })}
            className="rounded border-gray-700"
          />
          Ativo
        </label>
      </div>

      <p className="text-gray-500 text-xs truncate">{source.url}</p>

      <button
        onClick={() => deleteSource(source.id)}
        aria-label="Excluir"
        className="self-start text-xs text-red-400 hover:text-red-300 transition-colors mt-1"
      >
        Excluir
      </button>
    </article>
  )
}
```

- [ ] **Step 4: Run to confirm pass + commit**

```bash
npm run test:run -- SourceCard.spec
git add src/components/SourceCard/
git commit -m "feat: add SourceCard component (TDD)"
```

---

### Task 19: `AddCompanyModal` Component

**Files:**

- Create: `src/components/AddCompanyModal/AddCompanyModal.tsx`
- Create: `src/components/AddCompanyModal/AddCompanyModal.spec.tsx`

**Interfaces:**

- Consumes: `Company`, `RemoteBrazilStatus` from `src/types`; `useAddCompany`, `useEditCompany` from `src/hooks/useCompanyMutations.ts`; `useUIContext` from `src/contexts/UIContext.tsx`
- Produces: `<AddCompanyModal />` — reads open state and editingCompany from UIContext

- [ ] **Step 1: Write failing tests**

Create `src/components/AddCompanyModal/AddCompanyModal.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider, useUIContext } from '../../contexts/UIContext'
import { AddCompanyModal } from './AddCompanyModal'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <UIProvider>{children}</UIProvider>
    </QueryClientProvider>
  )
}

const OpenTrigger = () => {
  const { setCompanyModalOpen } = useUIContext()
  return <button onClick={() => setCompanyModalOpen(true)}>open</button>
}

const renderModal = () => {
  const wrapper = makeWrapper()
  render(
    <>
      <OpenTrigger />
      <AddCompanyModal />
    </>,
    { wrapper }
  )
}

describe('AddCompanyModal', () => {
  it('is not visible when closed', () => {
    renderModal()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is visible when open', async () => {
    renderModal()
    await userEvent.click(screen.getByText('open'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has a name input field', async () => {
    renderModal()
    await userEvent.click(screen.getByText('open'))
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
  })

  it('closes when cancel is clicked', async () => {
    renderModal()
    await userEvent.click(screen.getByText('open'))
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- AddCompanyModal.spec
```

- [ ] **Step 3: Implement `src/components/AddCompanyModal/AddCompanyModal.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { useUIContext } from '../../contexts/UIContext'
import { useAddCompany, useEditCompany } from '../../hooks/useCompanyMutations'
import type { RemoteBrazilStatus } from '../../types'

export const AddCompanyModal = () => {
  const { companyModalOpen, setCompanyModalOpen, editingCompany, setEditingCompany } =
    useUIContext()
  const { mutate: addCompany } = useAddCompany()
  const { mutate: editCompany } = useEditCompany()

  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [notes, setNotes] = useState('')
  const [remoteBrazil, setRemoteBrazil] = useState<RemoteBrazilStatus>('unknown')

  useEffect(() => {
    if (editingCompany) {
      setName(editingCompany.name)
      setWebsite(editingCompany.website ?? '')
      setNotes(editingCompany.notes ?? '')
      setRemoteBrazil(editingCompany.remote_brazil)
    } else {
      setName('')
      setWebsite('')
      setNotes('')
      setRemoteBrazil('unknown')
    }
  }, [editingCompany])

  const handleClose = () => {
    setCompanyModalOpen(false)
    setEditingCompany(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name,
      website: website || null,
      notes: notes || null,
      remote_brazil: remoteBrazil,
    }
    if (editingCompany) {
      editCompany({ ...editingCompany, ...data })
    } else {
      addCompany(data)
    }
    handleClose()
  }

  if (!companyModalOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-white font-semibold text-lg mb-4">
          {editingCompany ? 'Editar Empresa' : 'Adicionar Empresa'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Nome *
            <input
              aria-label="Nome"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Website
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Notas
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm resize-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Contrata remote do Brasil?
            <select
              value={remoteBrazil}
              onChange={(e) => setRemoteBrazil(e.target.value as RemoteBrazilStatus)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="unknown">Não confirmado</option>
              <option value="yes">Sim</option>
              <option value="no">Não</option>
            </select>
          </label>
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cancelar"
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
            >
              {editingCompany ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm pass + commit**

```bash
npm run test:run -- AddCompanyModal.spec
git add src/components/AddCompanyModal/
git commit -m "feat: add AddCompanyModal component (TDD)"
```

---

### Task 20: `AddSourceModal` Component

**Files:**

- Create: `src/components/AddSourceModal/AddSourceModal.tsx`
- Create: `src/components/AddSourceModal/AddSourceModal.spec.tsx`

**Interfaces:**

- Consumes: `useUIContext`; `useAddSource`, `useEditSource` from `src/hooks/useSourceMutations.ts`
- Produces: `<AddSourceModal />` — reads open state and editingSource from UIContext

- [ ] **Step 1: Write failing tests**

Create `src/components/AddSourceModal/AddSourceModal.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider, useUIContext } from '../../contexts/UIContext'
import { AddSourceModal } from './AddSourceModal'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <UIProvider>{children}</UIProvider>
    </QueryClientProvider>
  )
}

const OpenTrigger = () => {
  const { setSourceModalOpen } = useUIContext()
  return <button onClick={() => setSourceModalOpen(true)}>open</button>
}

const renderModal = () => {
  const wrapper = makeWrapper()
  render(
    <>
      <OpenTrigger />
      <AddSourceModal />
    </>,
    { wrapper }
  )
}

describe('AddSourceModal', () => {
  it('is not visible when closed', () => {
    renderModal()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is visible when open', async () => {
    renderModal()
    await userEvent.click(screen.getByText('open'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has label and URL inputs', async () => {
    renderModal()
    await userEvent.click(screen.getByText('open'))
    expect(screen.getByLabelText(/label/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/url/i)).toBeInTheDocument()
  })

  it('closes when cancel is clicked', async () => {
    renderModal()
    await userEvent.click(screen.getByText('open'))
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- AddSourceModal.spec
```

- [ ] **Step 3: Implement `src/components/AddSourceModal/AddSourceModal.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { useUIContext } from '../../contexts/UIContext'
import { useAddSource, useEditSource } from '../../hooks/useSourceMutations'

export const AddSourceModal = () => {
  const { sourceModalOpen, setSourceModalOpen, editingSource, setEditingSource } = useUIContext()
  const { mutate: addSource } = useAddSource()
  const { mutate: editSource } = useEditSource()

  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (editingSource) {
      setLabel(editingSource.label)
      setUrl(editingSource.url)
    } else {
      setLabel('')
      setUrl('')
    }
  }, [editingSource])

  const handleClose = () => {
    setSourceModalOpen(false)
    setEditingSource(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingSource) {
      editSource({ ...editingSource, label, url })
    } else {
      addSource({ label, url, is_active: true })
    }
    handleClose()
  }

  if (!sourceModalOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-white font-semibold text-lg mb-4">
          {editingSource ? 'Editar Fonte' : 'Adicionar Fonte'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Label *
            <input
              aria-label="Label"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            URL *
            <input
              aria-label="URL"
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cancelar"
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
            >
              {editingSource ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to confirm pass + commit**

```bash
npm run test:run -- AddSourceModal.spec
git add src/components/AddSourceModal/
git commit -m "feat: add AddSourceModal component (TDD)"
```

---

### Task 21: `DashboardPage` + `App.tsx` Wiring

**Files:**

- Create: `src/pages/DashboardPage.tsx`
- Create: `src/pages/DashboardPage.spec.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.spec.tsx`

**Interfaces:**

- Consumes: all hooks and components built in previous tasks
- Produces: fully wired SPA with routes `/` and `/wishlist`

- [ ] **Step 1: Write DashboardPage failing tests**

Create `src/pages/DashboardPage.spec.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../contexts/UIContext'
import { DashboardPage } from './DashboardPage'

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

describe('DashboardPage', () => {
  it('renders NavBar', () => {
    render(<DashboardPage />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
  })

  it('renders FilterBar', () => {
    render(<DashboardPage />, { wrapper: makeWrapper() })
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('renders job cards from mock data', async () => {
    render(<DashboardPage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- DashboardPage.spec
```

- [ ] **Step 3: Implement `src/pages/DashboardPage.tsx`**

```tsx
import { useMemo } from 'react'
import { NavBar } from '../components/NavBar/NavBar'
import { FilterBar } from '../components/FilterBar/FilterBar'
import { JobCard } from '../components/JobCard/JobCard'
import { useJobs } from '../hooks/useJobs'
import { useUIContext } from '../contexts/UIContext'
import type { Job } from '../types'

const applyFilters = (
  jobs: Job[],
  filters: { status: string; relevance: string; wishlistOnly: boolean }
): Job[] =>
  jobs.filter((job) => {
    if (filters.status !== 'all' && job.status !== filters.status) return false
    if (filters.relevance !== 'all' && job.relevance_level !== filters.relevance) return false
    if (filters.wishlistOnly && !job.is_wishlist_company) return false
    return true
  })

export const DashboardPage = () => {
  const { data: jobs = [], isLoading } = useJobs()
  const { filters } = useUIContext()

  const filteredJobs = useMemo(() => applyFilters(jobs, filters), [jobs, filters])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <FilterBar />
      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4">
        {isLoading && <p className="text-gray-500 text-sm">Carregando vagas...</p>}
        {!isLoading && filteredJobs.length === 0 && (
          <p className="text-gray-500 text-sm">Nenhuma vaga encontrada.</p>
        )}
        {filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Wire `src/App.tsx` with full providers and routes**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from './contexts/UIContext'
import { DashboardPage } from './pages/DashboardPage'
import { WishlistPage } from './pages/WishlistPage'

const queryClient = new QueryClient()

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <UIProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </UIProvider>
  </QueryClientProvider>
)
```

Note: `WishlistPage` will be created in Task 22. Add a temporary stub to `src/pages/WishlistPage.tsx` so App compiles:

```tsx
export const WishlistPage = () => <div>Wishlist</div>
```

- [ ] **Step 5: Update `src/App.spec.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders without crashing and shows dashboard', () => {
    render(<App />)
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run all tests**

```bash
npm run test:run
```

Expected: all pass (DashboardPage + previous tasks).

- [ ] **Step 7: Commit**

```bash
git add src/pages/DashboardPage.tsx src/pages/DashboardPage.spec.tsx src/App.tsx src/App.spec.tsx src/pages/WishlistPage.tsx
git commit -m "feat: add DashboardPage and wire App with providers and routes (TDD)"
```

---

### Task 22: `WishlistPage`

**Files:**

- Modify: `src/pages/WishlistPage.tsx` (replace stub)
- Create: `src/pages/WishlistPage.spec.tsx`

**Interfaces:**

- Consumes: all company and source components; `useCompanies`, `useSources` hooks; `useUIContext`
- Produces: `<WishlistPage />` — two-panel layout with companies (left) and sources (right)

- [ ] **Step 1: Write failing tests**

Create `src/pages/WishlistPage.spec.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../contexts/UIContext'
import { WishlistPage } from './WishlistPage'

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

describe('WishlistPage', () => {
  it('renders NavBar', () => {
    render(<WishlistPage />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
  })

  it('renders company cards from mock data', async () => {
    render(<WishlistPage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument()
    })
  })

  it('renders source cards from mock data', async () => {
    render(<WishlistPage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Lever Jobs')).toBeInTheDocument()
    })
  })

  it('has an Add Company button', () => {
    render(<WishlistPage />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /adicionar empresa/i })).toBeInTheDocument()
  })

  it('has an Add Source button', () => {
    render(<WishlistPage />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /adicionar fonte/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm run test:run -- WishlistPage.spec
```

- [ ] **Step 3: Implement `src/pages/WishlistPage.tsx`**

```tsx
import { NavBar } from '../components/NavBar/NavBar'
import { CompanyCard } from '../components/CompanyCard/CompanyCard'
import { SourceCard } from '../components/SourceCard/SourceCard'
import { AddCompanyModal } from '../components/AddCompanyModal/AddCompanyModal'
import { AddSourceModal } from '../components/AddSourceModal/AddSourceModal'
import { useCompanies } from '../hooks/useCompanies'
import { useSources } from '../hooks/useSources'
import { useUIContext } from '../contexts/UIContext'

export const WishlistPage = () => {
  const { data: companies = [] } = useCompanies()
  const { data: sources = [] } = useSources()
  const { setCompanyModalOpen, setSourceModalOpen } = useUIContext()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-base">Empresas</h2>
            <button
              onClick={() => setCompanyModalOpen(true)}
              aria-label="Adicionar empresa"
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
            >
              + Adicionar empresa
            </button>
          </div>
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-base">Fontes de scraping</h2>
            <button
              onClick={() => setSourceModalOpen(true)}
              aria-label="Adicionar fonte"
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
            >
              + Adicionar fonte
            </button>
          </div>
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </section>
      </main>

      <AddCompanyModal />
      <AddSourceModal />
    </div>
  )
}
```

- [ ] **Step 4: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 5: Run coverage check**

```bash
npm run coverage
```

Expected: lines ≥ 80%, functions ≥ 80%. If below, identify uncovered files and add missing test cases before committing.

- [ ] **Step 6: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/WishlistPage.tsx src/pages/WishlistPage.spec.tsx
git commit -m "feat: add WishlistPage — completes Remote Radar MVP (mock data phase)"
```

---

## Self-Review

**Spec coverage:**

- ✅ Vite scaffold + Vercel-ready (static SPA build)
- ✅ ESLint + Prettier + `react/no-multi-comp` + `max-lines: 250`
- ✅ Vitest + RTL + jsdom + 80% coverage gate
- ✅ Folder structure: components/, pages/, hooks/, types/, utils/, contexts/, data/
- ✅ TypeScript interfaces: `Job`, `Company`, `ScrapingSource`, `KeywordConfig`
- ✅ `scoring.ts` with keyword-based relevance levels
- ✅ `dorkUrl.ts` with correct LinkedIn dork format
- ✅ `useJobs` enriches with score + wishlist data, sorted by relevance desc
- ✅ `useUpdateJobStatus` with optimistic update
- ✅ `useCompanies` / `useCompanyMutations` (add/edit/delete)
- ✅ `useSources` / `useSourceMutations` (add/edit/delete)
- ✅ `UIContext` with filter state + modal state
- ✅ `NavBar`, `FilterBar`, `ScoreBadge`, `RemoteBrazilBadge`, `StatusDropdown`, `NetworkingButton`, `JobCard`, `CompanyCard`, `SourceCard`, `AddCompanyModal`, `AddSourceModal`
- ✅ `DashboardPage` with filter logic applied
- ✅ `WishlistPage` two-panel layout
- ✅ `remote_brazil` tri-state on companies (schema + badge + modal field)
- ✅ Mock data only — no Supabase calls
- ✅ Husky + lint-staged pre-commit hook

**Type consistency check:**

- `JobStatus` union used consistently in `StatusDropdown`, `useUpdateJobStatus`, `Job` interface ✅
- `RemoteBrazilStatus` used in `Company`, `RemoteBrazilBadge`, `AddCompanyModal` ✅
- `RelevanceLevel` used in `ScoreBadge`, `computeRelevanceScore` return type, `Job.relevance_level` ✅
- `COMPANIES_KEY` exported from `useCompanies.ts` and imported in `useCompanyMutations.ts` ✅
- `JOBS_KEY` exported from `useJobs.ts` and imported in `useUpdateJobStatus.ts` ✅
