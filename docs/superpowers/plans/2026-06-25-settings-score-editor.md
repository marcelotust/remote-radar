# Settings Score Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disabled "Cálculo de score" placeholder in the Settings page with a real editor for the Supabase-backed scoring config (keywords + weights + vetoes + thresholds + a live test preview).

**Architecture:** Six small co-located components compose into a self-contained editor on the Settings page. All reads come from `useScoringConfig`; all writes go through the existing `useScoringConfigMutations` hooks, which keep the `['scoring-config']` cache in sync, so edits reflect live in the preview and the Inbox. No `UIContext` changes — the add-keyword modal's open state is local to the editor.

**Tech Stack:** React, TypeScript, TanStack Query, Tailwind ("Neon Bubble" design system), Vitest + React Testing Library + `@testing-library/user-event`.

## Global Constraints

- Reuse existing components: `Toggle` (`src/components/Toggle/Toggle.tsx`), `ScoreBadge` (`src/components/ScoreBadge/ScoreBadge.tsx`).
- All scoring reads via `useScoringConfig()`; all writes via `useScoringConfigMutations` (`useAddScoringKeyword`, `useEditScoringKeyword`, `useDeleteScoringKeyword`, `useUpdateScoringSettings`). Never call Supabase directly from a component.
- Immediate persist on every row/threshold change — no global "Salvar" button. The add flow persists on modal submit.
- A veto forces `weight = 0` on write and hides the weight control. `weight` is ignored for vetoes.
- Threshold clamp is the only validation: keep `mediumThreshold ≤ highThreshold` by clamping the other value silently.
- Match the Neon Bubble styling already used in `AddCompanyModal` / `CompanyCard` (classes: `bg-brand-surface`, `bg-brand-input`, `border-brand-green/20`, `text-brand-pink`, `rounded-2xl`/`rounded-3xl`, `shadow-neon-*`, `transition-all duration-300`).
- Tests wrap hook-using components in a fresh `QueryClient` (`retry: false`) per test inside `QueryClientProvider`. The Supabase fake is globally mocked via `src/test-setup.ts`.
- Co-location: `Component/Component.tsx` + `Component/Component.spec.tsx`.
- Verify with `npm run test:run`, `npm run build`, `npm run lint`.

---

## File Structure

- `src/components/ScorePreview/ScorePreview.tsx` (+ spec) — live test box.
- `src/components/KeywordRow/KeywordRow.tsx` (+ spec) — one keyword's controls.
- `src/components/AddKeywordModal/AddKeywordModal.tsx` (+ spec) — add dialog (controlled).
- `src/components/ThresholdsForm/ThresholdsForm.tsx` (+ spec) — high/medium thresholds.
- `src/components/KeywordList/KeywordList.tsx` (+ spec) — grouped list + add button.
- `src/components/ScoringConfigEditor/ScoringConfigEditor.tsx` (+ spec) — container, owns modal state.
- `src/pages/SettingsPage.tsx` (+ spec) — render the editor in the score section.

---

## Task 1: ScorePreview

Live, read-only score tester. Reads the config from cache and recomputes on every keystroke.

**Files:**

- Create: `src/components/ScorePreview/ScorePreview.tsx`
- Test: `src/components/ScorePreview/ScorePreview.spec.tsx`

**Interfaces:**

- Consumes: `useScoringConfig()` → `{ data?: ScoringConfig }`; `computeRelevanceScore(job, config)`; `DEFAULT_SCORING_CONFIG`; `ScoreBadge`.
- Produces: `export const ScorePreview = () => JSX` (no props).

- [ ] **Step 1: Write the failing test**

Create `src/components/ScorePreview/ScorePreview.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { ScorePreview } from './ScorePreview'
import { SCORING_CONFIG_KEY } from '../../hooks/useScoringConfig'
import type { ScoringConfig } from '../../types'

const renderPreview = (config?: ScoringConfig) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (config) qc.setQueryData(SCORING_CONFIG_KEY, config)
  render(
    <QueryClientProvider client={qc}>
      <ScorePreview />
    </QueryClientProvider>
  )
}

const testConfig: ScoringConfig = {
  keywords: [
    { term: 'react', weight: 2, is_veto: false },
    { term: 'typescript', weight: 2, is_veto: false },
    { term: 'remote', weight: 2, is_veto: false },
    { term: 'presencial', weight: 0, is_veto: true },
  ],
  highThreshold: 4,
  mediumThreshold: 1,
}

describe('ScorePreview', () => {
  it('shows score 0 and Baixa for empty input', () => {
    renderPreview(testConfig)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Baixa')).toBeInTheDocument()
  })

  it('recomputes a high score as the user types', async () => {
    renderPreview(testConfig)
    await userEvent.type(screen.getByLabelText(/testar vaga/i), 'React TypeScript Remote')
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('Alta')).toBeInTheDocument()
  })

  it('shows Negativa when a veto keyword is present', async () => {
    renderPreview(testConfig)
    await userEvent.type(screen.getByLabelText(/testar vaga/i), 'React presencial')
    expect(screen.getByText('Negativa')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ScorePreview/ScorePreview.spec.tsx`
Expected: FAIL — `./ScorePreview` does not exist.

- [ ] **Step 3: Implement ScorePreview**

Create `src/components/ScorePreview/ScorePreview.tsx`:

```tsx
import { useState } from 'react'
import { useScoringConfig } from '../../hooks/useScoringConfig'
import { computeRelevanceScore } from '../../utils/scoring'
import { DEFAULT_SCORING_CONFIG } from '../../utils/keywords'
import { ScoreBadge } from '../ScoreBadge/ScoreBadge'

export const ScorePreview = () => {
  const { data: config = DEFAULT_SCORING_CONFIG } = useScoringConfig()
  const [text, setText] = useState('')
  const { score, level } = computeRelevanceScore({ title: text, description: null }, config)

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="score-preview" className="text-sm text-gray-400">
        Testar vaga
      </label>
      <textarea
        id="score-preview"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Cole o título/descrição de uma vaga"
        className="resize-none rounded-2xl border-2 border-brand-green/20 bg-brand-input px-4 py-2 text-sm text-white transition-all duration-300 focus:border-brand-green focus:bg-brand-green/5 focus:shadow-neon-input focus:outline-none"
      />
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span>
          Score: <span className="font-semibold text-white">{score}</span>
        </span>
        <ScoreBadge level={level} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ScorePreview/ScorePreview.spec.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ScorePreview
git commit -m "feat(settings): live score preview component (#43)"
```

---

## Task 2: KeywordRow

Controls for a single keyword: weight stepper (hidden for vetoes), veto toggle, delete. Each change persists immediately.

**Files:**

- Create: `src/components/KeywordRow/KeywordRow.tsx`
- Test: `src/components/KeywordRow/KeywordRow.spec.tsx`

**Interfaces:**

- Consumes: `useEditScoringKeyword()`, `useDeleteScoringKeyword()` → `{ mutate }`; `Toggle`; `ScoringKeyword`.
- Produces: `export const KeywordRow = ({ keyword }: { keyword: ScoringKeyword }) => JSX`.

- [ ] **Step 1: Write the failing test**

Create `src/components/KeywordRow/KeywordRow.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KeywordRow } from './KeywordRow'
import type { ScoringKeyword } from '../../types'

const { editMock, deleteMock } = vi.hoisted(() => ({
  editMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('../../hooks/useScoringConfigMutations', () => ({
  useEditScoringKeyword: () => ({ mutate: editMock }),
  useDeleteScoringKeyword: () => ({ mutate: deleteMock }),
}))

const keyword = (over: Partial<ScoringKeyword> = {}): ScoringKeyword => ({
  id: 'k1',
  user_id: null,
  term: 'react',
  weight: 2,
  is_veto: false,
  created_at: '2026-06-01T00:00:00Z',
  ...over,
})

describe('KeywordRow', () => {
  beforeEach(() => {
    editMock.mockClear()
    deleteMock.mockClear()
  })

  it('increments the weight on +', async () => {
    render(<KeywordRow keyword={keyword()} />)
    await userEvent.click(screen.getByLabelText(/aumentar peso de react/i))
    expect(editMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1', weight: 3 }))
  })

  it('decrements the weight on −', async () => {
    render(<KeywordRow keyword={keyword()} />)
    await userEvent.click(screen.getByLabelText(/diminuir peso de react/i))
    expect(editMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1', weight: 1 }))
  })

  it('toggles veto', async () => {
    render(<KeywordRow keyword={keyword()} />)
    await userEvent.click(screen.getByLabelText(/^veto$/i))
    expect(editMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1', is_veto: true }))
  })

  it('deletes by id', async () => {
    render(<KeywordRow keyword={keyword()} />)
    await userEvent.click(screen.getByLabelText(/excluir react/i))
    expect(deleteMock).toHaveBeenCalledWith('k1')
  })

  it('hides the weight stepper for a veto keyword', () => {
    render(<KeywordRow keyword={keyword({ is_veto: true, term: 'java' })} />)
    expect(screen.queryByLabelText(/peso de java/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/KeywordRow/KeywordRow.spec.tsx`
Expected: FAIL — `./KeywordRow` does not exist.

- [ ] **Step 3: Implement KeywordRow**

Create `src/components/KeywordRow/KeywordRow.tsx`:

```tsx
import {
  useEditScoringKeyword,
  useDeleteScoringKeyword,
} from '../../hooks/useScoringConfigMutations'
import { Toggle } from '../Toggle/Toggle'
import type { ScoringKeyword } from '../../types'

interface Props {
  keyword: ScoringKeyword
}

const stepperBtn =
  'h-6 w-6 rounded-full border-2 border-brand-green/20 text-gray-300 transition-all duration-300 hover:border-brand-green'

export const KeywordRow = ({ keyword }: Props) => {
  const { mutate: editKeyword } = useEditScoringKeyword()
  const { mutate: deleteKeyword } = useDeleteScoringKeyword()

  const setWeight = (weight: number) => editKeyword({ ...keyword, weight })
  const setVeto = (is_veto: boolean) => editKeyword({ ...keyword, is_veto })

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="flex-1 truncate text-sm text-white">{keyword.term}</span>

      {!keyword.is_veto && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={`Diminuir peso de ${keyword.term}`}
            onClick={() => setWeight(keyword.weight - 1)}
            className={stepperBtn}
          >
            −
          </button>
          <span
            aria-label={`Peso de ${keyword.term}`}
            className="w-6 text-center text-sm tabular-nums text-white"
          >
            {keyword.weight}
          </span>
          <button
            type="button"
            aria-label={`Aumentar peso de ${keyword.term}`}
            onClick={() => setWeight(keyword.weight + 1)}
            className={stepperBtn}
          >
            +
          </button>
        </div>
      )}

      <Toggle id={`veto-${keyword.id}`} label="Veto" checked={keyword.is_veto} onChange={setVeto} />

      <button
        type="button"
        aria-label={`Excluir ${keyword.term}`}
        onClick={() => deleteKeyword(keyword.id)}
        className="text-xs text-brand-pink transition-all duration-300 hover:text-brand-pink/80"
      >
        Excluir
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/KeywordRow/KeywordRow.spec.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/KeywordRow
git commit -m "feat(settings): keyword row with weight/veto/delete controls (#43)"
```

---

## Task 3: AddKeywordModal

Controlled dialog to add a keyword. `AddCompanyModal`-style.

**Files:**

- Create: `src/components/AddKeywordModal/AddKeywordModal.tsx`
- Test: `src/components/AddKeywordModal/AddKeywordModal.spec.tsx`

**Interfaces:**

- Consumes: `useAddScoringKeyword()` → `{ mutate }`; `Toggle`.
- Produces: `export const AddKeywordModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => JSX`.

- [ ] **Step 1: Write the failing test**

Create `src/components/AddKeywordModal/AddKeywordModal.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddKeywordModal } from './AddKeywordModal'

const { addMock } = vi.hoisted(() => ({ addMock: vi.fn() }))

vi.mock('../../hooks/useScoringConfigMutations', () => ({
  useAddScoringKeyword: () => ({ mutate: addMock }),
}))

describe('AddKeywordModal', () => {
  beforeEach(() => addMock.mockClear())

  it('is not rendered when closed', () => {
    render(<AddKeywordModal open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('adds a scored keyword with the entered term and weight', async () => {
    render(<AddKeywordModal open onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/palavra-chave/i), 'svelte')
    const weight = screen.getByLabelText(/peso/i)
    await userEvent.clear(weight)
    await userEvent.type(weight, '2')
    await userEvent.click(screen.getByRole('button', { name: /adicionar/i }))
    expect(addMock).toHaveBeenCalledWith({ term: 'svelte', weight: 2, is_veto: false })
  })

  it('hides the weight field and writes weight 0 when veto is on', async () => {
    render(<AddKeywordModal open onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/palavra-chave/i), 'cobol')
    await userEvent.click(screen.getByLabelText(/veto/i))
    expect(screen.queryByLabelText(/peso/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /adicionar/i }))
    expect(addMock).toHaveBeenCalledWith({ term: 'cobol', weight: 0, is_veto: true })
  })

  it('calls onClose on cancel', async () => {
    const onClose = vi.fn()
    render(<AddKeywordModal open onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/AddKeywordModal/AddKeywordModal.spec.tsx`
Expected: FAIL — `./AddKeywordModal` does not exist.

- [ ] **Step 3: Implement AddKeywordModal**

Create `src/components/AddKeywordModal/AddKeywordModal.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useAddScoringKeyword } from '../../hooks/useScoringConfigMutations'
import { Toggle } from '../Toggle/Toggle'

const inputClass =
  'bg-brand-input text-white border-2 border-brand-green/20 rounded-2xl px-3 py-2 text-sm transition-all duration-300 focus:outline-none focus:border-brand-green focus:bg-brand-green/5 focus:shadow-neon-input'

interface Props {
  open: boolean
  onClose: () => void
}

export const AddKeywordModal = ({ open, onClose }: Props) => {
  const { mutate: addKeyword } = useAddScoringKeyword()
  const [term, setTerm] = useState('')
  const [weight, setWeight] = useState(1)
  const [isVeto, setIsVeto] = useState(false)

  useEffect(() => {
    if (open) {
      setTerm('')
      setWeight(1)
      setIsVeto(false)
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addKeyword({ term: term.trim(), weight: isVeto ? 0 : weight, is_veto: isVeto })
    onClose()
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="w-full max-w-md rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6 shadow-neon-card">
        <h2 className="mb-4 text-lg font-semibold text-white">Adicionar palavra</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Palavra-chave *
            <input
              aria-label="Palavra-chave"
              required
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className={inputClass}
            />
          </label>

          {!isVeto && (
            <label className="flex flex-col gap-1 text-sm text-gray-400">
              Peso
              <input
                type="number"
                aria-label="Peso"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className={inputClass}
              />
            </label>
          )}

          <Toggle
            id="add-keyword-veto"
            label="Veto (vaga negativa)"
            checked={isVeto}
            onChange={setIsVeto}
          />

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Cancelar"
              className="px-4 py-2 text-sm text-gray-400 transition-all duration-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-brand-green px-5 py-2 text-sm font-medium text-black transition-all duration-300 hover:shadow-neon-active"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/AddKeywordModal/AddKeywordModal.spec.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/AddKeywordModal
git commit -m "feat(settings): add-keyword modal (#43)"
```

---

## Task 4: ThresholdsForm

Two integer inputs for the high/medium thresholds, persisting on change with a `medium ≤ high` clamp.

**Files:**

- Create: `src/components/ThresholdsForm/ThresholdsForm.tsx`
- Test: `src/components/ThresholdsForm/ThresholdsForm.spec.tsx`

**Interfaces:**

- Consumes: `useUpdateScoringSettings()` → `{ mutate }`.
- Produces: `export const ThresholdsForm = ({ highThreshold, mediumThreshold }: { highThreshold: number; mediumThreshold: number }) => JSX`.

- [ ] **Step 1: Write the failing test**

Create `src/components/ThresholdsForm/ThresholdsForm.spec.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThresholdsForm } from './ThresholdsForm'

const { updateMock } = vi.hoisted(() => ({ updateMock: vi.fn() }))

vi.mock('../../hooks/useScoringConfigMutations', () => ({
  useUpdateScoringSettings: () => ({ mutate: updateMock }),
}))

describe('ThresholdsForm', () => {
  beforeEach(() => updateMock.mockClear())

  it('persists a new high threshold', () => {
    render(<ThresholdsForm highThreshold={4} mediumThreshold={1} />)
    fireEvent.change(screen.getByLabelText(/limiar alta/i), { target: { value: '6' } })
    expect(updateMock).toHaveBeenCalledWith({ high_threshold: 6, medium_threshold: 1 })
  })

  it('persists a new medium threshold', () => {
    render(<ThresholdsForm highThreshold={4} mediumThreshold={1} />)
    fireEvent.change(screen.getByLabelText(/limiar média/i), { target: { value: '2' } })
    expect(updateMock).toHaveBeenCalledWith({ high_threshold: 4, medium_threshold: 2 })
  })

  it('clamps high up so medium never exceeds high', () => {
    render(<ThresholdsForm highThreshold={4} mediumThreshold={1} />)
    fireEvent.change(screen.getByLabelText(/limiar média/i), { target: { value: '9' } })
    expect(updateMock).toHaveBeenCalledWith({ high_threshold: 9, medium_threshold: 9 })
  })

  it('clamps medium down so it never exceeds high', () => {
    render(<ThresholdsForm highThreshold={4} mediumThreshold={3} />)
    fireEvent.change(screen.getByLabelText(/limiar alta/i), { target: { value: '2' } })
    expect(updateMock).toHaveBeenCalledWith({ high_threshold: 2, medium_threshold: 2 })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ThresholdsForm/ThresholdsForm.spec.tsx`
Expected: FAIL — `./ThresholdsForm` does not exist.

- [ ] **Step 3: Implement ThresholdsForm**

Create `src/components/ThresholdsForm/ThresholdsForm.tsx`:

```tsx
import { useUpdateScoringSettings } from '../../hooks/useScoringConfigMutations'

interface Props {
  highThreshold: number
  mediumThreshold: number
}

const numberInput =
  'w-16 rounded-2xl border-2 border-brand-green/20 bg-brand-input px-3 py-1.5 text-sm text-white transition-all duration-300 focus:border-brand-green focus:outline-none'

export const ThresholdsForm = ({ highThreshold, mediumThreshold }: Props) => {
  const { mutate: updateSettings } = useUpdateScoringSettings()

  const apply = (high: number, medium: number) =>
    updateSettings({ high_threshold: high, medium_threshold: medium })

  const setHigh = (high: number) => apply(high, Math.min(mediumThreshold, high))
  const setMedium = (medium: number) => apply(Math.max(highThreshold, medium), medium)

  return (
    <div className="flex flex-wrap gap-6">
      <label className="flex items-center gap-2 text-sm text-gray-400">
        Alta ≥
        <input
          type="number"
          aria-label="Limiar alta"
          value={highThreshold}
          onChange={(e) => setHigh(Number(e.target.value))}
          className={numberInput}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-400">
        Média ≥
        <input
          type="number"
          aria-label="Limiar média"
          value={mediumThreshold}
          onChange={(e) => setMedium(Number(e.target.value))}
          className={numberInput}
        />
      </label>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ThresholdsForm/ThresholdsForm.spec.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ThresholdsForm
git commit -m "feat(settings): threshold inputs with clamp (#43)"
```

---

## Task 5: KeywordList

Groups keywords into Vetos / Pontuação, renders a `KeywordRow` each, and an add button.

**Files:**

- Create: `src/components/KeywordList/KeywordList.tsx`
- Test: `src/components/KeywordList/KeywordList.spec.tsx`

**Interfaces:**

- Consumes: `KeywordRow` (renders real mutation hooks → tests need a `QueryClientProvider`); `ScoringKeyword`.
- Produces: `export const KeywordList = ({ keywords, onAdd }: { keywords: ScoringKeyword[]; onAdd: () => void }) => JSX`.

- [ ] **Step 1: Write the failing test**

Create `src/components/KeywordList/KeywordList.spec.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { KeywordList } from './KeywordList'
import type { ScoringKeyword } from '../../types'

const kw = (over: Partial<ScoringKeyword>): ScoringKeyword => ({
  id: over.term ?? 'k',
  user_id: null,
  term: 'x',
  weight: 0,
  is_veto: false,
  created_at: '',
  ...over,
})

const keywords: ScoringKeyword[] = [
  kw({ term: 'node', weight: 1 }),
  kw({ term: 'react', weight: 2 }),
  kw({ term: 'presencial', is_veto: true }),
]

const renderList = (onAdd = vi.fn()) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <KeywordList keywords={keywords} onAdd={onAdd} />
    </QueryClientProvider>
  )
  return onAdd
}

describe('KeywordList', () => {
  it('renders Vetos and Pontuação group headings', () => {
    renderList()
    expect(screen.getByRole('heading', { name: /vetos/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /pontuação/i })).toBeInTheDocument()
  })

  it('orders scored keywords by weight descending', () => {
    renderList()
    const terms = screen.getAllByText(/^(react|node)$/).map((el) => el.textContent)
    expect(terms).toEqual(['react', 'node'])
  })

  it('shows the veto keyword under Vetos', () => {
    renderList()
    expect(screen.getByText('presencial')).toBeInTheDocument()
  })

  it('invokes onAdd when the add button is clicked', async () => {
    const onAdd = renderList()
    await userEvent.click(screen.getByRole('button', { name: /adicionar palavra/i }))
    expect(onAdd).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/KeywordList/KeywordList.spec.tsx`
Expected: FAIL — `./KeywordList` does not exist.

- [ ] **Step 3: Implement KeywordList**

Create `src/components/KeywordList/KeywordList.tsx`:

```tsx
import { KeywordRow } from '../KeywordRow/KeywordRow'
import type { ScoringKeyword } from '../../types'

interface Props {
  keywords: ScoringKeyword[]
  onAdd: () => void
}

const byTerm = (a: ScoringKeyword, b: ScoringKeyword) => a.term.localeCompare(b.term)

export const KeywordList = ({ keywords, onAdd }: Props) => {
  const vetoes = keywords.filter((k) => k.is_veto).sort(byTerm)
  const scored = keywords
    .filter((k) => !k.is_veto)
    .sort((a, b) => b.weight - a.weight || byTerm(a, b))

  return (
    <div className="flex flex-col gap-4">
      {vetoes.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">Vetos</h3>
          {vetoes.map((k) => (
            <KeywordRow key={k.id} keyword={k} />
          ))}
        </section>
      )}
      {scored.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">Pontuação</h3>
          {scored.map((k) => (
            <KeywordRow key={k.id} keyword={k} />
          ))}
        </section>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="self-start rounded-2xl bg-brand-green px-4 py-1.5 text-sm font-medium text-black transition-all duration-300 hover:shadow-neon-active"
      >
        + Adicionar palavra
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/KeywordList/KeywordList.spec.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/KeywordList
git commit -m "feat(settings): grouped keyword list (#43)"
```

---

## Task 6: ScoringConfigEditor + SettingsPage integration

Compose the pieces, own the modal open state, and render the editor in the Settings score section.

**Files:**

- Create: `src/components/ScoringConfigEditor/ScoringConfigEditor.tsx`
- Test: `src/components/ScoringConfigEditor/ScoringConfigEditor.spec.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Modify: `src/pages/SettingsPage.spec.tsx`

**Interfaces:**

- Consumes: `useScoringConfig()`; `ThresholdsForm`, `KeywordList`, `AddKeywordModal`, `ScorePreview`; `DEFAULT_SCORING_CONFIG`; `ScoringKeyword`.
- Produces: `export const ScoringConfigEditor = () => JSX` (no props).

- [ ] **Step 1: Write the failing ScoringConfigEditor test**

Create `src/components/ScoringConfigEditor/ScoringConfigEditor.spec.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  it('renders thresholds, a seeded keyword, and the preview', async () => {
    renderEditor()
    await waitFor(() => expect(screen.getByLabelText(/limiar alta/i)).toHaveValue(4))
    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByLabelText(/testar vaga/i)).toBeInTheDocument()
  })

  it('opens the add-keyword modal from the add button', async () => {
    renderEditor()
    await waitFor(() => expect(screen.getByText('react')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /adicionar palavra/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ScoringConfigEditor/ScoringConfigEditor.spec.tsx`
Expected: FAIL — `./ScoringConfigEditor` does not exist.

- [ ] **Step 3: Implement ScoringConfigEditor**

Create `src/components/ScoringConfigEditor/ScoringConfigEditor.tsx`:

```tsx
import { useState } from 'react'
import { useScoringConfig } from '../../hooks/useScoringConfig'
import { DEFAULT_SCORING_CONFIG } from '../../utils/keywords'
import { ThresholdsForm } from '../ThresholdsForm/ThresholdsForm'
import { KeywordList } from '../KeywordList/KeywordList'
import { AddKeywordModal } from '../AddKeywordModal/AddKeywordModal'
import { ScorePreview } from '../ScorePreview/ScorePreview'
import type { ScoringKeyword } from '../../types'

export const ScoringConfigEditor = () => {
  const { data: config = DEFAULT_SCORING_CONFIG } = useScoringConfig()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <ThresholdsForm
        highThreshold={config.highThreshold}
        mediumThreshold={config.mediumThreshold}
      />
      <KeywordList
        keywords={config.keywords as ScoringKeyword[]}
        onAdd={() => setModalOpen(true)}
      />
      <ScorePreview />
      <AddKeywordModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ScoringConfigEditor/ScoringConfigEditor.spec.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Update the SettingsPage and its test**

Replace the entire contents of `src/pages/SettingsPage.tsx` with:

```tsx
import { ScoringConfigEditor } from '../components/ScoringConfigEditor/ScoringConfigEditor'

export const SettingsPage = () => (
  <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-8">
    <section className="rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6 flex flex-col gap-4">
      <h2 className="text-white font-semibold text-base">Cálculo de score</h2>
      <ScoringConfigEditor />
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

Replace the entire contents of `src/pages/SettingsPage.spec.tsx` with (the page now uses `useScoringConfig`, so it must render inside a `QueryClientProvider`):

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { SettingsPage } from './SettingsPage'

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <SettingsPage />
    </QueryClientProvider>
  )
}

describe('SettingsPage', () => {
  it('renders the score and theme sections', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /cálculo de score/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /tema/i })).toBeInTheDocument()
  })

  it('renders the interactive score editor', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /adicionar palavra/i })).toBeInTheDocument()
    )
    expect(screen.getByLabelText(/testar vaga/i)).toBeInTheDocument()
  })

  it('shows an inert theme selector with three options', () => {
    renderPage()
    expect(screen.getByLabelText(/claro/i)).toBeDisabled()
    expect(screen.getByLabelText(/escuro/i)).toBeDisabled()
    expect(screen.getByLabelText(/sistema/i)).toBeDisabled()
  })
})
```

- [ ] **Step 6: Run the page + editor tests**

Run: `npx vitest run src/pages/SettingsPage.spec.tsx src/components/ScoringConfigEditor/ScoringConfigEditor.spec.tsx`
Expected: PASS.

- [ ] **Step 7: Run the full suite, build, and lint**

Run: `npm run test:run && npm run build && npm run lint`
Expected: all tests PASS; no type errors; lint reports no new errors (a single pre-existing `UIContext.tsx` warning is unrelated).

- [ ] **Step 8: Commit**

```bash
git add src/components/ScoringConfigEditor src/pages/SettingsPage.tsx src/pages/SettingsPage.spec.tsx
git commit -m "feat(settings): wire scoring editor into the Settings page (#43)"
```

---

## Self-Review Notes

- **Spec coverage:** ScorePreview (Task 1), KeywordRow (Task 2), AddKeywordModal (Task 3), ThresholdsForm + clamp (Task 4), KeywordList grouping/sort (Task 5), ScoringConfigEditor container + SettingsPage integration + spec update (Task 6). Every spec component and the integration are covered.
- **Type consistency:** `ScoringKeyword` (with `id`) is the row/list/editor prop type throughout; `useEditScoringKeyword` takes a full `ScoringKeyword`, `useDeleteScoringKeyword` takes `id: string`, `useAddScoringKeyword` takes `{ term, weight, is_veto }`, `useUpdateScoringSettings` takes `{ high_threshold, medium_threshold }` — matching the merged hooks.
- **Known acceptable transient:** while `useScoringConfig` is loading, `ScoringConfigEditor` falls back to `DEFAULT_SCORING_CONFIG`, whose keywords are `ScoringRule` (no `id`); the `as ScoringKeyword[]` cast yields rows with `id === undefined` for the sub-second loading window. Acceptable for v1 (matches the fallback intent); real rows carry ids once loaded.
- **Deviation from design doc:** the add-modal and threshold weight controls use numeric `<input type="number">` rather than `+`/`−` steppers (the inline `KeywordRow` still uses steppers). Simpler and equally testable; functional behavior is unchanged.
