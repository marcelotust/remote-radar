# Configurable Scoring Persisted in Supabase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move relevance scoring from a hardcoded keyword list to a weighted-keyword + hard-veto model persisted in Supabase, read and tuned by the app.

**Architecture:** Two new Supabase tables (`scoring_keywords`, `scoring_settings`) hold per-keyword weights/vetoes and the high/medium thresholds, modeled with a nullable `user_id` for future per-user config. A `useScoringConfig` hook resolves them into a `ScoringConfig` (falling back to a hardcoded default), `useScoringConfigMutations` edits them, and `computeRelevanceScore` + `useJobs` consume the resolved config, always recomputing client-side.

**Tech Stack:** TypeScript, React, TanStack Query, Supabase (PostgreSQL 15+), Vitest + React Testing Library.

## Global Constraints

- All Supabase access stays inside hooks; components/pages never import `supabase` directly.
- Mutation hooks follow the `useCompanyMutations` pattern: Supabase write → `setQueryData` cache sync.
- Tests use a fresh `QueryClient` per test (`retry: false`) wrapped in `QueryClientProvider`.
- The in-memory Supabase fake (`src/lib/__mocks__/supabase.ts`) is seeded from `src/data/mockData.ts` and reset before every test.
- Keyword weights: strong positive = `2`, weak positive = `1`, veto weight = `0` (ignored).
- Default thresholds: `high_threshold = 4`, `medium_threshold = 1`.
- Run the full suite with `npm run test:run`; type-check with `npm run build`.

---

## File Structure

- `src/types/index.ts` — replace `KeywordConfig` with `ScoringRule`, `ScoringKeyword`, `ScoringSettings`, `ScoringConfig`.
- `src/utils/keywords.ts` — replace `KEYWORD_CONFIG` with `DEFAULT_SCORING_CONFIG: ScoringConfig`.
- `src/utils/scoring.ts` — new weighted + veto logic.
- `src/utils/scoring.spec.ts` — rewritten tests.
- `src/hooks/useJobs.ts` — `enrichJobs` drops the stored-score short-circuit; `useJobs` reads `useScoringConfig`.
- `src/hooks/useJobs.spec.tsx` — updated `enrichJobs` tests.
- `src/hooks/useScoringConfig.ts` + `.spec.tsx` — read hook (new).
- `src/hooks/useScoringConfigMutations.ts` + `.spec.tsx` — mutation hooks (new).
- `src/data/mockData.ts` — `MOCK_SCORING_KEYWORDS`, `MOCK_SCORING_SETTINGS`.
- `src/lib/__mocks__/supabase.ts` — seed both tables; add `is()` filter.
- `supabase/schema.sql` — two tables, RLS, default seed.

---

## Task 1: Weighted + veto scoring core (default config)

Replaces the count-based model with weighted keywords + vetoes, using a hardcoded default config. No Supabase yet — `useJobs` keeps working off `DEFAULT_SCORING_CONFIG`.

**Files:**

- Modify: `src/types/index.ts:44-47` (replace `KeywordConfig`)
- Modify: `src/utils/keywords.ts` (replace whole file)
- Modify: `src/utils/scoring.ts:1-24`
- Modify: `src/utils/scoring.spec.ts` (replace whole file)
- Modify: `src/hooks/useJobs.ts:1-33` (`enrichJobs` only)
- Modify: `src/hooks/useJobs.spec.tsx:112-129` (`enrichJobs` describe block)

**Interfaces:**

- Produces:
  - `ScoringRule { term: string; weight: number; is_veto: boolean }`
  - `ScoringKeyword extends ScoringRule { id: string; user_id: string | null; created_at: string }`
  - `ScoringSettings { id: string; user_id: string | null; high_threshold: number; medium_threshold: number; created_at: string }`
  - `ScoringConfig { keywords: ScoringRule[]; highThreshold: number; mediumThreshold: number }`
  - `DEFAULT_SCORING_CONFIG: ScoringConfig`
  - `computeRelevanceScore(job: Pick<Job,'title'|'description'>, config: ScoringConfig): { score: number; level: RelevanceLevel }`
  - `enrichJobs(rawJobs: Job[], companies: Company[], config?: ScoringConfig): Job[]`

- [ ] **Step 1: Replace the `KeywordConfig` type with the new scoring types**

In `src/types/index.ts`, replace the `KeywordConfig` interface (lines 44-47) with:

```ts
export interface ScoringRule {
  term: string
  weight: number
  is_veto: boolean
}

export interface ScoringKeyword extends ScoringRule {
  id: string
  user_id: string | null
  created_at: string
}

export interface ScoringSettings {
  id: string
  user_id: string | null
  high_threshold: number
  medium_threshold: number
  created_at: string
}

export interface ScoringConfig {
  keywords: ScoringRule[]
  highThreshold: number
  mediumThreshold: number
}
```

- [ ] **Step 2: Replace `KEYWORD_CONFIG` with `DEFAULT_SCORING_CONFIG`**

Replace the entire contents of `src/utils/keywords.ts` with:

```ts
import type { ScoringConfig } from '../types'

// Default scoring config used as a fallback until Supabase has rows. Mirrors the
// seed in supabase/schema.sql. Weights: strong = 2, weak = 1, veto weight = 0.
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  keywords: [
    // Vetoes — any match forces the job to 'negative'.
    { term: 'presencial', weight: 0, is_veto: true },
    { term: 'híbrido', weight: 0, is_veto: true },
    { term: 'hybrid', weight: 0, is_veto: true },
    { term: 'on-site', weight: 0, is_veto: true },
    { term: 'onsite', weight: 0, is_veto: true },
    { term: 'java', weight: 0, is_veto: true },
    { term: 'php', weight: 0, is_veto: true },
    { term: 'cobol', weight: 0, is_veto: true },
    { term: '.net', weight: 0, is_veto: true },
    { term: 'c#', weight: 0, is_veto: true },
    { term: 'golang', weight: 0, is_veto: true },
    // Strong positive (+2).
    { term: 'react', weight: 2, is_veto: false },
    { term: 'remote', weight: 2, is_veto: false },
    { term: 'worldwide remote', weight: 2, is_veto: false },
    { term: 'remote worldwide', weight: 2, is_veto: false },
    { term: '100% remote', weight: 2, is_veto: false },
    { term: 'frontend', weight: 2, is_veto: false },
    { term: 'front-end', weight: 2, is_veto: false },
    { term: 'typescript', weight: 2, is_veto: false },
    // Weak positive (+1).
    { term: 'reactjs', weight: 1, is_veto: false },
    { term: 'next.js', weight: 1, is_veto: false },
    { term: 'nextjs', weight: 1, is_veto: false },
    { term: 'tailwind', weight: 1, is_veto: false },
    { term: 'node', weight: 1, is_veto: false },
    { term: 'rails', weight: 1, is_veto: false },
    { term: 'css', weight: 1, is_veto: false },
    { term: 'javascript', weight: 1, is_veto: false },
    { term: 'js', weight: 1, is_veto: false },
    { term: 'figma', weight: 1, is_veto: false },
    { term: 'ux', weight: 1, is_veto: false },
    { term: 'ui', weight: 1, is_veto: false },
    { term: 'hotwire', weight: 1, is_veto: false },
    { term: 'worldwide', weight: 1, is_veto: false },
  ],
  highThreshold: 4,
  mediumThreshold: 1,
}
```

- [ ] **Step 3: Rewrite the scoring spec to drive the new model**

Replace the entire contents of `src/utils/scoring.spec.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { computeRelevanceScore } from './scoring'
import type { ScoringConfig } from '../types'

const config: ScoringConfig = {
  keywords: [
    { term: 'react', weight: 2, is_veto: false },
    { term: 'typescript', weight: 2, is_veto: false },
    { term: 'node', weight: 1, is_veto: false },
    { term: 'worldwide remote', weight: 2, is_veto: false },
    { term: 'java', weight: 0, is_veto: true },
    { term: 'presencial', weight: 0, is_veto: true },
    { term: 'legacy', weight: -1, is_veto: false },
  ],
  highThreshold: 4,
  mediumThreshold: 1,
}

describe('computeRelevanceScore', () => {
  it('sums weights and returns high at/above the high threshold', () => {
    const job = { title: 'React TypeScript Engineer', description: null }
    expect(computeRelevanceScore(job, config)).toEqual({ score: 4, level: 'high' })
  })

  it('returns medium between medium and high thresholds', () => {
    const job = { title: 'Node Developer', description: null }
    expect(computeRelevanceScore(job, config)).toEqual({ score: 1, level: 'medium' })
  })

  it('returns low when score is 0', () => {
    const job = { title: 'Backend Developer', description: null }
    expect(computeRelevanceScore(job, config)).toEqual({ score: 0, level: 'low' })
  })

  it('forces negative when a veto keyword matches, ignoring positive points', () => {
    const job = { title: 'React TypeScript presencial', description: null }
    const { level } = computeRelevanceScore(job, config)
    expect(level).toBe('negative')
  })

  it('returns negative when negative-weight keywords push the score below 0', () => {
    const job = { title: 'Legacy maintainer', description: null }
    expect(computeRelevanceScore(job, config)).toEqual({ score: -1, level: 'negative' })
  })

  it('matches multi-word phrases', () => {
    const job = { title: 'Worldwide Remote React role', description: null }
    expect(computeRelevanceScore(job, config)).toEqual({ score: 4, level: 'high' })
  })

  it('reads keywords from the description too', () => {
    const job = { title: 'Developer', description: 'Strong react and node skills' }
    expect(computeRelevanceScore(job, config)).toEqual({ score: 3, level: 'medium' })
  })

  it('handles a null description gracefully', () => {
    const job = { title: 'Developer', description: null }
    expect(() => computeRelevanceScore(job, config)).not.toThrow()
  })
})
```

- [ ] **Step 4: Run the scoring spec to verify it fails**

Run: `npx vitest run src/utils/scoring.spec.ts`
Expected: FAIL — `computeRelevanceScore` still expects the old `KeywordConfig` shape (`config.positive`), so calls error / assertions fail.

- [ ] **Step 5: Rewrite `computeRelevanceScore`**

Replace the entire contents of `src/utils/scoring.ts` with:

```ts
import type { Job, ScoringConfig, RelevanceLevel } from '../types'

const matchesKeyword = (text: string, keyword: string): boolean => {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Boundaries via lookarounds (not \b, which breaks on '.', '#', '-').
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(text)
}

export const computeRelevanceScore = (
  job: Pick<Job, 'title' | 'description'>,
  config: ScoringConfig
): { score: number; level: RelevanceLevel } => {
  const text = `${job.title} ${job.description ?? ''}`.toLowerCase()

  const matched = config.keywords.filter((k) => matchesKeyword(text, k.term))
  const hasVeto = matched.some((k) => k.is_veto)
  const score = matched.filter((k) => !k.is_veto).reduce((sum, k) => sum + k.weight, 0)

  const level: RelevanceLevel = hasVeto
    ? 'negative'
    : score >= config.highThreshold
      ? 'high'
      : score >= config.mediumThreshold
        ? 'medium'
        : score >= 0
          ? 'low'
          : 'negative'

  return { score, level }
}
```

- [ ] **Step 6: Run the scoring spec to verify it passes**

Run: `npx vitest run src/utils/scoring.spec.ts`
Expected: PASS (8 tests).

- [ ] **Step 7: Update `enrichJobs` to always recompute from a config**

In `src/hooks/useJobs.ts`, change the import on line 4 from:

```ts
import { KEYWORD_CONFIG } from '../utils/keywords'
```

to:

```ts
import { DEFAULT_SCORING_CONFIG } from '../utils/keywords'
import type { ScoringConfig } from '../types'
```

Then replace the `enrichJobs` function (lines 10-33) with:

```ts
export const enrichJobs = (
  rawJobs: Job[],
  companies: Company[],
  config: ScoringConfig = DEFAULT_SCORING_CONFIG
): Job[] => {
  const wishlistMap = new Map(companies.map((c) => [c.name.toLowerCase(), c]))
  return rawJobs
    .map((job) => {
      const { score, level } = computeRelevanceScore(job, config)
      const wishlistCompany = wishlistMap.get(job.company.toLowerCase())
      return {
        ...job,
        relevance_score: score,
        relevance_level: level,
        is_wishlist_company: !!wishlistCompany,
        wishlist_remote_brazil: wishlistCompany?.remote_brazil,
      }
    })
    .sort((a, b) => {
      const t = new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime()
      return t !== 0 ? t : (b.relevance_score ?? 0) - (a.relevance_score ?? 0)
    })
}
```

(`RelevanceLevel` is no longer referenced in this file; leave the existing `Job`/`Company` imports as they are — they are still used.)

- [ ] **Step 8: Update the `enrichJobs` tests for the always-recompute behavior**

In `src/hooks/useJobs.spec.tsx`, replace the two tests at lines 112-129 (the `it('prefers a stored relevance score over recomputing')` and `it('computes the score when none is stored')` blocks) with:

```ts
describe('enrichJobs', () => {
  it('always recomputes the score from the config, ignoring any stored score', () => {
    const job = baseJob({
      title: 'React TypeScript Remote',
      relevance_score: 99,
      relevance_level: 'low',
    })
    const [out] = enrichJobs([job], [])
    // react(2) + typescript(2) + remote(2) = 6 with DEFAULT_SCORING_CONFIG
    expect(out.relevance_score).toBe(6)
    expect(out.relevance_level).toBe('high')
  })
```

Leave the rest of the `enrichJobs` describe block (the `flags wishlist companies`, `orders by scraped_at`, and `breaks scraped_at ties` tests) unchanged — they already call `enrichJobs([...], [...])` with no config and rely on the default.

- [ ] **Step 9: Run the full suite and type-check**

Run: `npx vitest run src/utils/scoring.spec.ts src/hooks/useJobs.spec.tsx && npm run build`
Expected: PASS for both spec files; `npm run build` completes with no type errors (confirms no lingering `KeywordConfig`/`KEYWORD_CONFIG` references).

- [ ] **Step 10: Commit**

```bash
git add src/types/index.ts src/utils/keywords.ts src/utils/scoring.ts src/utils/scoring.spec.ts src/hooks/useJobs.ts src/hooks/useJobs.spec.tsx
git commit -m "feat(scoring): weighted keywords + veto model with default config (#43)"
```

---

## Task 2: Supabase persistence — schema, fake, read + mutation hooks

Adds the two tables, seeds the fake, and ships `useScoringConfig` / `useScoringConfigMutations`. `useJobs` still uses the default in this task; wiring happens in Task 3.

**Files:**

- Modify: `supabase/schema.sql` (append tables, RLS, seed)
- Modify: `src/data/mockData.ts` (append seeds)
- Modify: `src/lib/__mocks__/supabase.ts:10-14` (seed) and add `is()` method
- Create: `src/hooks/useScoringConfig.ts`
- Create: `src/hooks/useScoringConfig.spec.tsx`
- Create: `src/hooks/useScoringConfigMutations.ts`
- Create: `src/hooks/useScoringConfigMutations.spec.tsx`

**Interfaces:**

- Consumes: `ScoringKeyword`, `ScoringSettings`, `ScoringConfig`, `DEFAULT_SCORING_CONFIG` (Task 1).
- Produces:
  - `SCORING_CONFIG_KEY = ['scoring-config'] as const`
  - `useScoringConfig(): UseQueryResult<ScoringConfig>`
  - `MOCK_SCORING_KEYWORDS: ScoringKeyword[]`, `MOCK_SCORING_SETTINGS: ScoringSettings[]`
  - `useAddScoringKeyword()` — mutate `{ term: string; weight: number; is_veto: boolean }`
  - `useEditScoringKeyword()` — mutate a full `ScoringKeyword`
  - `useDeleteScoringKeyword()` — mutate `id: string`
  - `useUpdateScoringSettings()` — mutate `{ high_threshold: number; medium_threshold: number }`

- [ ] **Step 1: Add the schema tables, RLS, and seed**

Append to `supabase/schema.sql` (after the `scraping_sources` table, before or after the existing RLS block — keep new RLS with the new tables):

```sql
-- Scoring config (issue #43) ------------------------------------------------
-- Weighted keywords + hard vetoes. `user_id` is nullable: null = global/default
-- config. Modeled for future per-user config (filter by user_id, fall back to
-- the global row). `nulls not distinct` keeps a single global row per term.
create table if not exists scoring_keywords (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  term       text not null,
  weight     int  not null default 1,
  is_veto    boolean not null default false,
  created_at timestamptz default now(),
  unique nulls not distinct (user_id, term)
);

create table if not exists scoring_settings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid,
  high_threshold   int not null default 4,
  medium_threshold int not null default 1,
  created_at       timestamptz default now(),
  unique nulls not distinct (user_id)
);

alter table scoring_keywords enable row level security;
alter table scoring_settings enable row level security;

create policy "scoring_keywords_anon_read"   on scoring_keywords for select to anon using (true);
create policy "scoring_keywords_anon_insert" on scoring_keywords for insert to anon with check (true);
create policy "scoring_keywords_anon_update" on scoring_keywords for update to anon using (true) with check (true);
create policy "scoring_keywords_anon_delete" on scoring_keywords for delete to anon using (true);

create policy "scoring_settings_anon_read"   on scoring_settings for select to anon using (true);
create policy "scoring_settings_anon_insert" on scoring_settings for insert to anon with check (true);
create policy "scoring_settings_anon_update" on scoring_settings for update to anon using (true) with check (true);

-- Default global config seed.
insert into scoring_settings (user_id, high_threshold, medium_threshold)
values (null, 4, 1)
on conflict do nothing;

insert into scoring_keywords (user_id, term, weight, is_veto) values
  (null, 'presencial', 0, true),
  (null, 'híbrido', 0, true),
  (null, 'hybrid', 0, true),
  (null, 'on-site', 0, true),
  (null, 'onsite', 0, true),
  (null, 'java', 0, true),
  (null, 'php', 0, true),
  (null, 'cobol', 0, true),
  (null, '.net', 0, true),
  (null, 'c#', 0, true),
  (null, 'golang', 0, true),
  (null, 'react', 2, false),
  (null, 'remote', 2, false),
  (null, 'worldwide remote', 2, false),
  (null, 'remote worldwide', 2, false),
  (null, '100% remote', 2, false),
  (null, 'frontend', 2, false),
  (null, 'front-end', 2, false),
  (null, 'typescript', 2, false),
  (null, 'reactjs', 1, false),
  (null, 'next.js', 1, false),
  (null, 'nextjs', 1, false),
  (null, 'tailwind', 1, false),
  (null, 'node', 1, false),
  (null, 'rails', 1, false),
  (null, 'css', 1, false),
  (null, 'javascript', 1, false),
  (null, 'js', 1, false),
  (null, 'figma', 1, false),
  (null, 'ux', 1, false),
  (null, 'ui', 1, false),
  (null, 'hotwire', 1, false),
  (null, 'worldwide', 1, false)
on conflict do nothing;
```

- [ ] **Step 2: Add mock seeds derived from the default config**

In `src/data/mockData.ts`, add to the imports at the top:

```ts
import type { Job, Company, ScrapingSource, ScoringKeyword, ScoringSettings } from '../types'
import { DEFAULT_SCORING_CONFIG } from '../utils/keywords'
```

(Replace the existing `import type { Job, Company, ScrapingSource } from '../types'` line.)

Then append at the end of the file:

```ts
export const MOCK_SCORING_KEYWORDS: ScoringKeyword[] = DEFAULT_SCORING_CONFIG.keywords.map(
  (k, i) => ({
    id: `sk${i + 1}`,
    user_id: null,
    created_at: '2026-06-01T00:00:00Z',
    ...k,
  })
)

export const MOCK_SCORING_SETTINGS: ScoringSettings[] = [
  {
    id: 'ss1',
    user_id: null,
    high_threshold: DEFAULT_SCORING_CONFIG.highThreshold,
    medium_threshold: DEFAULT_SCORING_CONFIG.mediumThreshold,
    created_at: '2026-06-01T00:00:00Z',
  },
]
```

- [ ] **Step 3: Seed both tables in the fake and add an `is()` filter**

In `src/lib/__mocks__/supabase.ts`, update the import on line 1:

```ts
import {
  MOCK_JOBS,
  MOCK_COMPANIES,
  MOCK_SOURCES,
  MOCK_SCORING_KEYWORDS,
  MOCK_SCORING_SETTINGS,
} from '../../data/mockData'
```

Update `seed()` (lines 10-14) to:

```ts
const seed = (): Record<string, Row[]> => ({
  jobs: structuredClone(MOCK_JOBS) as unknown as Row[],
  companies: structuredClone(MOCK_COMPANIES) as unknown as Row[],
  scraping_sources: structuredClone(MOCK_SOURCES) as unknown as Row[],
  scoring_keywords: structuredClone(MOCK_SCORING_KEYWORDS) as unknown as Row[],
  scoring_settings: structuredClone(MOCK_SCORING_SETTINGS) as unknown as Row[],
})
```

Add an `is()` method to `QueryBuilder` (right after the `eq()` method, around line 60) — PostgREST uses `.is()` for null comparisons, so the hooks call `.is('user_id', null)`:

```ts
  is(column: string, value: unknown) {
    this.filters.push([column, value])
    return this
  }
```

- [ ] **Step 4: Write the failing `useScoringConfig` spec**

Create `src/hooks/useScoringConfig.spec.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { useScoringConfig } from './useScoringConfig'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useScoringConfig', () => {
  it('resolves keywords and thresholds from Supabase', async () => {
    const { result } = renderHook(() => useScoringConfig(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const config = result.current.data!
    expect(config.highThreshold).toBe(4)
    expect(config.mediumThreshold).toBe(1)
    const react = config.keywords.find((k) => k.term === 'react')
    expect(react).toMatchObject({ weight: 2, is_veto: false })
    const java = config.keywords.find((k) => k.term === 'java')
    expect(java).toMatchObject({ is_veto: true })
  })
})
```

- [ ] **Step 5: Run the spec to verify it fails**

Run: `npx vitest run src/hooks/useScoringConfig.spec.tsx`
Expected: FAIL — `./useScoringConfig` does not exist.

- [ ] **Step 6: Implement `useScoringConfig`**

Create `src/hooks/useScoringConfig.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { DEFAULT_SCORING_CONFIG } from '../utils/keywords'
import type { ScoringConfig, ScoringKeyword, ScoringSettings } from '../types'

export const SCORING_CONFIG_KEY = ['scoring-config'] as const

export const useScoringConfig = () =>
  useQuery<ScoringConfig>({
    queryKey: SCORING_CONFIG_KEY,
    queryFn: async () => {
      const [keywordsRes, settingsRes] = await Promise.all([
        supabase.from('scoring_keywords').select('*'),
        supabase.from('scoring_settings').select('*'),
      ])
      if (keywordsRes.error) throw keywordsRes.error
      if (settingsRes.error) throw settingsRes.error

      const keywords = keywordsRes.data as ScoringKeyword[]
      const settings = (settingsRes.data as ScoringSettings[])[0]

      return {
        keywords: keywords.length ? keywords : DEFAULT_SCORING_CONFIG.keywords,
        highThreshold: settings?.high_threshold ?? DEFAULT_SCORING_CONFIG.highThreshold,
        mediumThreshold: settings?.medium_threshold ?? DEFAULT_SCORING_CONFIG.mediumThreshold,
      }
    },
  })
```

- [ ] **Step 7: Run the spec to verify it passes**

Run: `npx vitest run src/hooks/useScoringConfig.spec.tsx`
Expected: PASS.

- [ ] **Step 8: Write the failing mutations spec**

Create `src/hooks/useScoringConfigMutations.spec.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { useScoringConfig } from './useScoringConfig'
import {
  useAddScoringKeyword,
  useDeleteScoringKeyword,
  useEditScoringKeyword,
  useUpdateScoringSettings,
} from './useScoringConfigMutations'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useAddScoringKeyword', () => {
  it('adds a keyword to the cached config', async () => {
    const wrapper = makeWrapper()
    const { result: cfg } = renderHook(() => useScoringConfig(), { wrapper })
    await waitFor(() => expect(cfg.current.isSuccess).toBe(true))
    const initial = cfg.current.data!.keywords.length

    const { result: add } = renderHook(() => useAddScoringKeyword(), { wrapper })
    add.current.mutate({ term: 'svelte', weight: 1, is_veto: false })

    await waitFor(() => expect(cfg.current.data!.keywords.length).toBe(initial + 1))
    expect(cfg.current.data!.keywords.some((k) => k.term === 'svelte')).toBe(true)
  })
})

describe('useEditScoringKeyword', () => {
  it('updates a keyword in the cached config', async () => {
    const wrapper = makeWrapper()
    const { result: cfg } = renderHook(() => useScoringConfig(), { wrapper })
    await waitFor(() => expect(cfg.current.isSuccess).toBe(true))
    const node = cfg.current.data!.keywords.find((k) => k.term === 'node')! as {
      id: string
    } & Record<string, unknown>

    const { result: edit } = renderHook(() => useEditScoringKeyword(), { wrapper })
    edit.current.mutate({ ...node, weight: 2 } as never)

    await waitFor(() =>
      expect(cfg.current.data!.keywords.find((k) => k.term === 'node')!.weight).toBe(2)
    )
  })
})

describe('useDeleteScoringKeyword', () => {
  it('removes a keyword from the cached config', async () => {
    const wrapper = makeWrapper()
    const { result: cfg } = renderHook(() => useScoringConfig(), { wrapper })
    await waitFor(() => expect(cfg.current.isSuccess).toBe(true))
    const node = cfg.current.data!.keywords.find((k) => k.term === 'node') as {
      id: string
    }

    const { result: del } = renderHook(() => useDeleteScoringKeyword(), { wrapper })
    del.current.mutate(node.id)

    await waitFor(() =>
      expect(cfg.current.data!.keywords.some((k) => k.term === 'node')).toBe(false)
    )
  })
})

describe('useUpdateScoringSettings', () => {
  it('updates thresholds in the cached config', async () => {
    const wrapper = makeWrapper()
    const { result: cfg } = renderHook(() => useScoringConfig(), { wrapper })
    await waitFor(() => expect(cfg.current.isSuccess).toBe(true))

    const { result: upd } = renderHook(() => useUpdateScoringSettings(), { wrapper })
    upd.current.mutate({ high_threshold: 6, medium_threshold: 2 })

    await waitFor(() => expect(cfg.current.data!.highThreshold).toBe(6))
    expect(cfg.current.data!.mediumThreshold).toBe(2)
  })
})
```

- [ ] **Step 9: Run the mutations spec to verify it fails**

Run: `npx vitest run src/hooks/useScoringConfigMutations.spec.tsx`
Expected: FAIL — `./useScoringConfigMutations` does not exist.

- [ ] **Step 10: Implement the mutation hooks**

Create `src/hooks/useScoringConfigMutations.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { DEFAULT_SCORING_CONFIG } from '../utils/keywords'
import { SCORING_CONFIG_KEY } from './useScoringConfig'
import type { ScoringConfig, ScoringKeyword } from '../types'

type NewKeyword = Pick<ScoringKeyword, 'term' | 'weight' | 'is_veto'>

export const useAddScoringKeyword = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: NewKeyword): Promise<ScoringKeyword> => {
      const { data: inserted, error } = await supabase
        .from('scoring_keywords')
        .insert({ ...data, user_id: null })
        .select()
        .single()
      if (error) throw error
      return inserted as ScoringKeyword
    },
    onSuccess: (keyword) => {
      qc.setQueryData<ScoringConfig>(SCORING_CONFIG_KEY, (old) => {
        const base = old ?? DEFAULT_SCORING_CONFIG
        return { ...base, keywords: [...base.keywords, keyword] }
      })
    },
  })
}

export const useEditScoringKeyword = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (keyword: ScoringKeyword): Promise<ScoringKeyword> => {
      const patch = {
        term: keyword.term,
        weight: keyword.weight,
        is_veto: keyword.is_veto,
      }
      const { data: updated, error } = await supabase
        .from('scoring_keywords')
        .update(patch)
        .eq('id', keyword.id)
        .select()
        .single()
      if (error) throw error
      return updated as ScoringKeyword
    },
    onSuccess: (updated) => {
      qc.setQueryData<ScoringConfig>(SCORING_CONFIG_KEY, (old) => {
        const base = old ?? DEFAULT_SCORING_CONFIG
        return {
          ...base,
          keywords: base.keywords.map((k) =>
            'id' in k && (k as ScoringKeyword).id === updated.id ? updated : k
          ),
        }
      })
    },
  })
}

export const useDeleteScoringKeyword = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('scoring_keywords').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, id) => {
      qc.setQueryData<ScoringConfig>(SCORING_CONFIG_KEY, (old) => {
        const base = old ?? DEFAULT_SCORING_CONFIG
        return {
          ...base,
          keywords: base.keywords.filter((k) => !('id' in k) || (k as ScoringKeyword).id !== id),
        }
      })
    },
  })
}

type SettingsPatch = { high_threshold: number; medium_threshold: number }

export const useUpdateScoringSettings = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: SettingsPatch): Promise<SettingsPatch> => {
      const { error } = await supabase.from('scoring_settings').update(patch).is('user_id', null)
      if (error) throw error
      return patch
    },
    onSuccess: (patch) => {
      qc.setQueryData<ScoringConfig>(SCORING_CONFIG_KEY, (old) => ({
        ...(old ?? DEFAULT_SCORING_CONFIG),
        highThreshold: patch.high_threshold,
        mediumThreshold: patch.medium_threshold,
      }))
    },
  })
}
```

- [ ] **Step 11: Run the mutations spec to verify it passes**

Run: `npx vitest run src/hooks/useScoringConfigMutations.spec.tsx`
Expected: PASS (4 tests).

- [ ] **Step 12: Run the full suite and type-check**

Run: `npm run test:run && npm run build`
Expected: all tests PASS; build has no type errors.

- [ ] **Step 13: Commit**

```bash
git add supabase/schema.sql src/data/mockData.ts src/lib/__mocks__/supabase.ts src/hooks/useScoringConfig.ts src/hooks/useScoringConfig.spec.tsx src/hooks/useScoringConfigMutations.ts src/hooks/useScoringConfigMutations.spec.tsx
git commit -m "feat(scoring): persist scoring config in Supabase with read/mutation hooks (#43)"
```

---

## Task 3: Wire `useJobs` to the Supabase config

`useJobs` reads the resolved config from `useScoringConfig` and feeds it into `enrichJobs`, so Settings edits change displayed scores live.

**Files:**

- Modify: `src/hooks/useJobs.ts:35-47` (`useJobs` only)
- Modify: `src/hooks/useJobs.spec.tsx` (add a config-driven recompute test)

**Interfaces:**

- Consumes: `useScoringConfig` + `SCORING_CONFIG_KEY` (Task 2), `enrichJobs(rawJobs, companies, config)` (Task 1).

- [ ] **Step 1: Write a failing test that config changes re-score jobs**

In `src/hooks/useJobs.spec.tsx`, add this test inside the existing top-level `describe('useJobs', …)` block (after the existing `it('sorts jobs by relevance_score descending')`). First extend the imports at the top of the file:

```ts
import { useJobs, enrichJobs } from './useJobs'
import { useUpdateScoringSettings } from './useScoringConfigMutations'
```

Then add the test:

```ts
it('recomputes job scores when the scoring config changes', async () => {
  const wrapper = makeWrapper()
  const { result: jobs } = renderHook(() => useJobs(), { wrapper })
  await waitFor(() => expect(jobs.current.isSuccess).toBe(true))
  const stripeBefore = jobs.current.data!.find((j) => j.company === 'Stripe')!
  // react(2)+typescript(2)+next.js(1) = 5 → high with default high_threshold=4
  expect(stripeBefore.relevance_level).toBe('high')

  const { result: upd } = renderHook(() => useUpdateScoringSettings(), { wrapper })
  upd.current.mutate({ high_threshold: 99, medium_threshold: 1 })

  await waitFor(() => {
    const stripeAfter = jobs.current.data!.find((j) => j.company === 'Stripe')!
    expect(stripeAfter.relevance_level).toBe('medium')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/useJobs.spec.tsx -t "recomputes job scores"`
Expected: FAIL — `useJobs` still uses `DEFAULT_SCORING_CONFIG`, so the level stays `high` after the settings change.

- [ ] **Step 3: Wire `useScoringConfig` into `useJobs`**

In `src/hooks/useJobs.ts`, add the import (next to the other hook imports near line 5):

```ts
import { useScoringConfig } from './useScoringConfig'
```

Replace the `useJobs` function (lines 35-47) with:

```ts
export const useJobs = () => {
  const { data: companies = [] } = useCompanies()
  const { data: scoringConfig = DEFAULT_SCORING_CONFIG } = useScoringConfig()

  return useQuery<Job[]>({
    queryKey: JOBS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*')
      if (error) throw error
      return data as Job[]
    },
    select: (rawJobs) => enrichJobs(rawJobs, companies, scoringConfig),
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/hooks/useJobs.spec.tsx -t "recomputes job scores"`
Expected: PASS.

- [ ] **Step 5: Run the full suite, type-check, and lint**

Run: `npm run test:run && npm run build && npm run lint`
Expected: all tests PASS; no type errors; no lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useJobs.ts src/hooks/useJobs.spec.tsx
git commit -m "feat(scoring): drive useJobs scoring from the Supabase config (#43)"
```

---

## Self-Review Notes

- **Spec coverage:** schema + per-user modeling (Task 2 Step 1); read hook + fallback (Task 2 Steps 4-7, fallback exercised by `keywords.length ? … : DEFAULT`); mutation hook (Task 2 Steps 8-11); scoring integration + recompute-on-change (Tasks 1 & 3); fake + seed + tests (Task 2 Steps 2-3, all spec steps). All four acceptance criteria map to tasks.
- **Behavior change:** the always-recompute decision is implemented in Task 1 Step 7 and its test updated in Task 1 Step 8 (the old "prefers a stored relevance score" test is intentionally replaced).
- **Type consistency:** `ScoringRule`/`ScoringKeyword`/`ScoringSettings`/`ScoringConfig` defined in Task 1 Step 1 are used verbatim across all later tasks; `SCORING_CONFIG_KEY` defined in Task 2 Step 6 is reused by mutations (Step 10).
- **Fallback caveat (acceptable):** when the cached config is the hardcoded `DEFAULT_SCORING_CONFIG` (rules without `id`), edit/delete mutations guard with `'id' in k`; in practice the seeded rows always carry ids, so cache sync targets real rows.
