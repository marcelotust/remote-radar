# Textarea-bucket Score Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline keyword editor (per-row steppers/veto/delete/add-modal) with four comma-separated textareas (Veto / +2 / +1 / −1) saved via a full-table replace, fixing the dead +/− buttons at the root.

**Architecture:** A new `KeywordBuckets` component edits four textareas and persists the whole keyword set through a new `useReplaceScoringKeywords` hook (delete-all-global + array-insert + invalidate). `ThresholdsForm` and `ScorePreview` are unchanged; `KeywordList`/`KeywordRow`/`AddKeywordModal` are removed.

**Tech Stack:** React, TypeScript, TanStack Query, Supabase (+ in-memory fake), Tailwind ("Neon Bubble"), Vitest + React Testing Library.

## Global Constraints

- All Supabase access stays inside hooks; components never import `supabase`.
- Four buckets with fixed weights: Veto → `{ is_veto: true, weight: 0 }`; Positivo forte (+2) → `{ weight: 2, is_veto: false }`; Positivo fraco (+1) → `{ weight: 1, is_veto: false }`; Negativo (−1) → `{ weight: -1, is_veto: false }`.
- Load classification of an existing keyword: `is_veto` → Veto; else `weight >= 2` → +2; else `weight <= -1` → −1; else (1 or 0) → +1.
- `parseTerms`: split on `,`, `.trim()`, `.toLowerCase()`, drop blanks, dedupe.
- Cross-bucket dedupe on save: first bucket in order [veto, +2, +1, −1] wins.
- Save persists the whole set via full replace (`useReplaceScoringKeywords`); thresholds keep their existing auto-persist; `ScorePreview` unchanged.
- Neon Bubble styling (`bg-brand-input`, `border-brand-green/20`, `rounded-2xl`, `bg-brand-green` button, `transition-all duration-300`).
- Tests wrap hook-using components/hooks in a fresh `QueryClient` (`retry: false`) per test; the Supabase fake is globally mocked via `src/test-setup.ts`.
- Verify with `npm run test:run`, `npm run build`, `npm run lint`.

---

## File Structure

- `src/lib/__mocks__/supabase.ts` — `insert` accepts `Row | Row[]` (array push).
- `src/hooks/useScoringConfigMutations.ts` — add `useReplaceScoringKeywords`.
- `src/hooks/useScoringConfigMutations.spec.tsx` — add its test.
- `src/components/KeywordBuckets/KeywordBuckets.tsx` (+ spec) — new editor + `parseTerms`.
- `src/components/ScoringConfigEditor/ScoringConfigEditor.tsx` (+ spec) — swap to buckets.
- `src/pages/SettingsPage.spec.tsx` — update editor-render assertion.
- Delete: `src/components/KeywordList/`, `src/components/KeywordRow/`, `src/components/AddKeywordModal/`.

---

## Task 1: Full-replace hook + fake array-insert

Adds `useReplaceScoringKeywords` and teaches the Supabase fake to handle array inserts (PostgREST supports them; the hook relies on it).

**Files:**

- Modify: `src/lib/__mocks__/supabase.ts`
- Modify: `src/hooks/useScoringConfigMutations.ts`
- Modify: `src/hooks/useScoringConfigMutations.spec.tsx`

**Interfaces:**

- Consumes: `supabase` fake; `SCORING_CONFIG_KEY`; `ScoringRule` (`{ term: string; weight: number; is_veto: boolean }`).
- Produces: `useReplaceScoringKeywords()` → `{ mutate }`, `mutate(rules: ScoringRule[])` — deletes all global `scoring_keywords` rows then inserts `rules` (with `user_id: null`) and invalidates the config query.

- [ ] **Step 1: Write the failing hook test**

In `src/hooks/useScoringConfigMutations.spec.tsx`, add `useReplaceScoringKeywords` to the existing import from `'./useScoringConfigMutations'`:

```tsx
import {
  useAddScoringKeyword,
  useDeleteScoringKeyword,
  useEditScoringKeyword,
  useReplaceScoringKeywords,
  useUpdateScoringSettings,
} from './useScoringConfigMutations'
```

Then append this describe block at the end of the file:

```tsx
describe('useReplaceScoringKeywords', () => {
  it('replaces the whole keyword set', async () => {
    const wrapper = makeWrapper()
    const { result: cfg } = renderHook(() => useScoringConfig(), { wrapper })
    await waitFor(() => expect(cfg.current.isSuccess).toBe(true))

    const { result: rep } = renderHook(() => useReplaceScoringKeywords(), { wrapper })
    rep.current.mutate([
      { term: 'svelte', weight: 2, is_veto: false },
      { term: 'cobol', weight: 0, is_veto: true },
    ])

    await waitFor(() => {
      const terms = cfg.current.data!.keywords.map((k) => k.term).sort()
      expect(terms).toEqual(['cobol', 'svelte'])
    })
    const svelte = cfg.current.data!.keywords.find((k) => k.term === 'svelte')!
    expect(svelte).toMatchObject({ weight: 2, is_veto: false })
    const cobol = cfg.current.data!.keywords.find((k) => k.term === 'cobol')!
    expect(cobol).toMatchObject({ is_veto: true })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/useScoringConfigMutations.spec.tsx -t "replaces the whole keyword set"`
Expected: FAIL — `useReplaceScoringKeywords` is not exported (and array insert not yet supported).

- [ ] **Step 3: Teach the fake to handle array inserts**

In `src/lib/__mocks__/supabase.ts`:

Change the `payload` field declaration (currently `private payload: Row | null = null`) to:

```ts
  private payload: Row | Row[] | null = null
```

Change the `insert` method signature from `insert(payload: Row)` to:

```ts
  insert(payload: Row | Row[]) {
    this.op = 'insert'
    this.payload = payload
    return this
  }
```

Replace the `case 'insert':` block in `run()` with:

```ts
      case 'insert': {
        const stamp = (p: Row): Row => ({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...p,
        })
        if (Array.isArray(this.payload)) {
          const rows = this.payload.map(stamp)
          table.push(...rows)
          return { data: structuredClone(rows), error: null }
        }
        const row = stamp(this.payload as Row)
        table.push(row)
        return { data: structuredClone(row), error: null }
      }
```

In the `case 'update':` block, the `Object.assign(r, this.payload)` now sees a wider type; change it to `Object.assign(r, this.payload as Row)` so it still type-checks.

- [ ] **Step 4: Implement `useReplaceScoringKeywords`**

In `src/hooks/useScoringConfigMutations.ts`, add `ScoringRule` to the type import:

```ts
import type { ScoringConfig, ScoringKeyword, ScoringRule } from '../types'
```

Append this hook at the end of the file:

```ts
export const useReplaceScoringKeywords = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (rules: ScoringRule[]): Promise<void> => {
      const { error: delError } = await supabase
        .from('scoring_keywords')
        .delete()
        .is('user_id', null)
      if (delError) throw delError
      if (rules.length > 0) {
        const { error: insError } = await supabase
          .from('scoring_keywords')
          .insert(rules.map((r) => ({ ...r, user_id: null })))
        if (insError) throw insError
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCORING_CONFIG_KEY })
    },
  })
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/hooks/useScoringConfigMutations.spec.tsx`
Expected: PASS (all existing tests + the new one).

- [ ] **Step 6: Commit**

```bash
git add src/lib/__mocks__/supabase.ts src/hooks/useScoringConfigMutations.ts src/hooks/useScoringConfigMutations.spec.tsx
git commit -m "feat(settings): full-replace scoring-keywords hook + array insert in fake (#43)"
```

---

## Task 2: KeywordBuckets component

Four textareas seeded from the config; Save parses them into the full keyword set and calls the replace hook.

**Files:**

- Create: `src/components/KeywordBuckets/KeywordBuckets.tsx`
- Test: `src/components/KeywordBuckets/KeywordBuckets.spec.tsx`

**Interfaces:**

- Consumes: `useScoringConfig()`; `useReplaceScoringKeywords()` (Task 1); `DEFAULT_SCORING_CONFIG`; `ScoringRule`.
- Produces: `export const KeywordBuckets = () => JSX` (no props); `export const parseTerms = (input: string) => string[]`.

- [ ] **Step 1: Write the failing test**

Create `src/components/KeywordBuckets/KeywordBuckets.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KeywordBuckets, parseTerms } from './KeywordBuckets'
import { SCORING_CONFIG_KEY } from '../../hooks/useScoringConfig'
import type { ScoringConfig } from '../../types'

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }))

vi.mock('../../hooks/useScoringConfigMutations', () => ({
  useReplaceScoringKeywords: () => ({ mutate: replaceMock }),
}))

const config: ScoringConfig = {
  keywords: [
    { term: 'react', weight: 2, is_veto: false },
    { term: 'css', weight: 1, is_veto: false },
    { term: 'wordpress', weight: -1, is_veto: false },
    { term: 'presencial', weight: 0, is_veto: true },
  ],
  highThreshold: 4,
  mediumThreshold: 1,
}

const renderBuckets = (cfg: ScoringConfig = config) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  qc.setQueryData(SCORING_CONFIG_KEY, cfg)
  render(
    <QueryClientProvider client={qc}>
      <KeywordBuckets />
    </QueryClientProvider>
  )
}

describe('parseTerms', () => {
  it('splits, trims, lowercases, drops blanks and dedupes', () => {
    expect(parseTerms(' React, css ,, REACT,  ')).toEqual(['react', 'css'])
  })
})

describe('KeywordBuckets', () => {
  beforeEach(() => replaceMock.mockClear())

  it('pre-fills each textarea from the config', () => {
    renderBuckets()
    expect((screen.getByLabelText(/positivo forte/i) as HTMLTextAreaElement).value).toBe('react')
    expect((screen.getByLabelText(/positivo fraco/i) as HTMLTextAreaElement).value).toBe('css')
    expect((screen.getByLabelText(/negativo/i) as HTMLTextAreaElement).value).toBe('wordpress')
    expect((screen.getByLabelText(/veto/i) as HTMLTextAreaElement).value).toBe('presencial')
  })

  it('saves the parsed full set with the right weights and veto flags', async () => {
    renderBuckets()
    const strong = screen.getByLabelText(/positivo forte/i)
    await userEvent.clear(strong)
    await userEvent.type(strong, 'react, vue')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(replaceMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith([
      { term: 'presencial', weight: 0, is_veto: true },
      { term: 'react', weight: 2, is_veto: false },
      { term: 'vue', weight: 2, is_veto: false },
      { term: 'css', weight: 1, is_veto: false },
      { term: 'wordpress', weight: -1, is_veto: false },
    ])
  })

  it('dedupes a term across buckets, keeping the earliest bucket', async () => {
    renderBuckets()
    const weak = screen.getByLabelText(/positivo fraco/i)
    await userEvent.clear(weak)
    await userEvent.type(weak, 'react, css') // react also lives in +2
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    const rules = replaceMock.mock.calls[0][0] as Array<{ term: string; weight: number }>
    const react = rules.filter((r) => r.term === 'react')
    expect(react).toEqual([{ term: 'react', weight: 2, is_veto: false }])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/KeywordBuckets/KeywordBuckets.spec.tsx`
Expected: FAIL — `./KeywordBuckets` does not exist.

- [ ] **Step 3: Implement KeywordBuckets**

Create `src/components/KeywordBuckets/KeywordBuckets.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useScoringConfig } from '../../hooks/useScoringConfig'
import { useReplaceScoringKeywords } from '../../hooks/useScoringConfigMutations'
import { DEFAULT_SCORING_CONFIG } from '../../utils/keywords'
import type { ScoringConfig, ScoringRule } from '../../types'

export const parseTerms = (input: string): string[] => {
  const seen = new Set<string>()
  for (const raw of input.split(',')) {
    const t = raw.trim().toLowerCase()
    if (t) seen.add(t)
  }
  return [...seen]
}

const toBuckets = (keywords: ScoringConfig['keywords']) => {
  const veto: string[] = []
  const strong: string[] = []
  const weak: string[] = []
  const negative: string[] = []
  for (const k of keywords) {
    if (k.is_veto) veto.push(k.term)
    else if (k.weight >= 2) strong.push(k.term)
    else if (k.weight <= -1) negative.push(k.term)
    else weak.push(k.term)
  }
  return {
    veto: veto.join(', '),
    strong: strong.join(', '),
    weak: weak.join(', '),
    negative: negative.join(', '),
  }
}

const textareaClass =
  'resize-none rounded-2xl border-2 border-brand-green/20 bg-brand-input px-4 py-2 text-sm text-white transition-all duration-300 focus:border-brand-green focus:bg-brand-green/5 focus:shadow-neon-input focus:outline-none'

export const KeywordBuckets = () => {
  const { data: config = DEFAULT_SCORING_CONFIG } = useScoringConfig()
  const { mutate: replace } = useReplaceScoringKeywords()

  const [veto, setVeto] = useState('')
  const [strong, setStrong] = useState('')
  const [weak, setWeak] = useState('')
  const [negative, setNegative] = useState('')

  useEffect(() => {
    const b = toBuckets(config.keywords)
    setVeto(b.veto)
    setStrong(b.strong)
    setWeak(b.weak)
    setNegative(b.negative)
  }, [config])

  const handleSave = () => {
    const used = new Set<string>()
    const rules: ScoringRule[] = []
    const add = (terms: string[], weight: number, is_veto: boolean) => {
      for (const term of terms) {
        if (used.has(term)) continue
        used.add(term)
        rules.push({ term, weight, is_veto })
      }
    }
    add(parseTerms(veto), 0, true)
    add(parseTerms(strong), 2, false)
    add(parseTerms(weak), 1, false)
    add(parseTerms(negative), -1, false)
    replace(rules)
  }

  const field = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-sm text-gray-400">
      {label}
      <textarea
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className={textareaClass}
      />
    </label>
  )

  return (
    <div className="flex flex-col gap-4">
      {field('Veto (vaga negativa)', veto, setVeto)}
      {field('Positivo forte (+2)', strong, setStrong)}
      {field('Positivo fraco (+1)', weak, setWeak)}
      {field('Negativo (−1)', negative, setNegative)}
      <button
        type="button"
        onClick={handleSave}
        className="self-start rounded-2xl bg-brand-green px-4 py-1.5 text-sm font-medium text-black transition-all duration-300 hover:shadow-neon-active"
      >
        Salvar palavras
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/KeywordBuckets/KeywordBuckets.spec.tsx`
Expected: PASS (4 tests).

Note on selectors: `getByLabelText(/veto/i)` resolves uniquely to the Veto textarea — the other labels do not contain "veto". `/negativo/i` matches only "Negativo (−1)".

- [ ] **Step 5: Commit**

```bash
git add src/components/KeywordBuckets
git commit -m "feat(settings): textarea keyword buckets editor (#43)"
```

---

## Task 3: Wire buckets into the editor; remove the old keyword UI

Swap `ScoringConfigEditor` to render `KeywordBuckets`, update the editor + page specs, and delete the three replaced components.

**Files:**

- Modify: `src/components/ScoringConfigEditor/ScoringConfigEditor.tsx`
- Modify: `src/components/ScoringConfigEditor/ScoringConfigEditor.spec.tsx`
- Modify: `src/pages/SettingsPage.spec.tsx`
- Delete: `src/components/KeywordList/`, `src/components/KeywordRow/`, `src/components/AddKeywordModal/`

**Interfaces:**

- Consumes: `KeywordBuckets` (Task 2); `ThresholdsForm`, `ScorePreview` (unchanged); `useScoringConfig`; `DEFAULT_SCORING_CONFIG`.

- [ ] **Step 1: Update the ScoringConfigEditor spec (failing)**

Replace the entire contents of `src/components/ScoringConfigEditor/ScoringConfigEditor.spec.tsx` with:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { ScoringConfigEditor } from './ScoringConfigEditor'

const renderEditor = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <ScoringConfigEditor />
    </QueryClientProvider>
  )
}

describe('ScoringConfigEditor', () => {
  it('renders thresholds, keyword buckets, and the preview', async () => {
    renderEditor()
    await waitFor(() => expect(screen.getByLabelText(/limiar alta/i)).toHaveValue(4))
    const strong = screen.getByLabelText(/positivo forte/i) as HTMLTextAreaElement
    expect(strong.value).toContain('react')
    expect(screen.getByLabelText(/testar vaga/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/ScoringConfigEditor/ScoringConfigEditor.spec.tsx`
Expected: FAIL — the editor still renders the old `KeywordList`/add button, not the bucket textareas.

- [ ] **Step 3: Swap the editor to buckets**

Replace the entire contents of `src/components/ScoringConfigEditor/ScoringConfigEditor.tsx` with:

```tsx
import { useScoringConfig } from '../../hooks/useScoringConfig'
import { DEFAULT_SCORING_CONFIG } from '../../utils/keywords'
import { ThresholdsForm } from '../ThresholdsForm/ThresholdsForm'
import { KeywordBuckets } from '../KeywordBuckets/KeywordBuckets'
import { ScorePreview } from '../ScorePreview/ScorePreview'

export const ScoringConfigEditor = () => {
  const { data: config = DEFAULT_SCORING_CONFIG } = useScoringConfig()

  return (
    <div className="flex flex-col gap-6">
      <ThresholdsForm
        highThreshold={config.highThreshold}
        mediumThreshold={config.mediumThreshold}
      />
      <KeywordBuckets />
      <ScorePreview />
    </div>
  )
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/components/ScoringConfigEditor/ScoringConfigEditor.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Update the SettingsPage editor-render test**

In `src/pages/SettingsPage.spec.tsx`, replace the `it('renders the interactive score editor', ...)` test (the `waitFor` block referencing `/adicionar palavra/i`) with:

```tsx
it('renders the interactive score editor', async () => {
  renderPage()
  await waitFor(() => {
    expect(screen.getByLabelText(/veto/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/testar vaga/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Delete the replaced components**

```bash
git rm -r src/components/KeywordList src/components/KeywordRow src/components/AddKeywordModal
```

- [ ] **Step 7: Verify nothing else references the removed components**

Run: `grep -rn "KeywordList\|KeywordRow\|AddKeywordModal" src`
Expected: no matches (empty output). If anything matches, it is stale and must be removed.

- [ ] **Step 8: Run the full suite, build, and lint**

Run: `npm run test:run && npm run build && npm run lint`
Expected: all tests PASS; no type errors; lint reports no new errors (a single pre-existing `UIContext.tsx` warning is unrelated).

- [ ] **Step 9: Commit**

```bash
git add src/components/ScoringConfigEditor src/pages/SettingsPage.spec.tsx
git commit -m "feat(settings): replace inline keyword UI with textarea buckets (#43)"
```

---

## Self-Review Notes

- **Spec coverage:** full-replace hook + fake array-insert (Task 1); four-bucket textareas, `parseTerms`, classification, cross-bucket dedupe, fixed weights (Task 2); editor composition swap, page spec, removal of the three components (Task 3). The empty-table case is covered by the hook's delete-then-insert (insert populates an empty table) and exercised indirectly by the replace test starting from the seeded fake.
- **Placeholder scan:** none — every code/step is concrete.
- **Type consistency:** `useReplaceScoringKeywords(rules: ScoringRule[])` is defined in Task 1 and consumed verbatim in Task 2; `ScoringRule` shape (`term`/`weight`/`is_veto`) matches the existing type; the bucket weights (0/2/1/−1) and classification thresholds are identical across the spec, component, and tests.
- **Save-order note:** `handleSave` emits rules grouped by bucket in order [veto, +2, +1, −1]; the Task 2 "saves the parsed full set" test asserts exactly that order, and within a bucket the order follows `parseTerms` insertion order.
- **Known limitation (from spec):** the replace is delete-then-insert, not transactional; an insert failure after the delete leaves the table empty until the next save. Accepted for v1.
