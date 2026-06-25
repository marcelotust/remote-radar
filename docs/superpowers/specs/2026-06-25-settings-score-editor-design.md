# Settings score editor (#43 UI)

## Goal

Replace the disabled "Cálculo de score" placeholder in the Settings page with a
real editor for the Supabase-backed scoring config (keywords + weights + vetoes +
thresholds) shipped in PR #59. The theme placeholder (#44) stays untouched.

## Context

The backend is on `main`:

- `useScoringConfig()` → resolved `ScoringConfig { keywords: ScoringRule[]; highThreshold; mediumThreshold }`, cache key `['scoring-config']`, with `DEFAULT_SCORING_CONFIG` fallback.
- `useScoringConfigMutations` → `useAddScoringKeyword` (`{ term, weight, is_veto }`), `useEditScoringKeyword` (full `ScoringKeyword`), `useDeleteScoringKeyword` (`id`), `useUpdateScoringSettings` (`{ high_threshold, medium_threshold }`). Each does the Supabase write then `setQueryData`-syncs `['scoring-config']`.
- `computeRelevanceScore(job, config)` is a pure client function.
- `useJobs` already recomputes job scores live from this config.

Keyword model: `ScoringRule { term: string; weight: number; is_veto: boolean }`;
the resolved cache holds `ScoringKeyword` rows (rule + `id`/`user_id`/`created_at`).
A veto forces a job to `negative` regardless of weight; `weight` is ignored for
vetoes. `score` = sum of matched non-veto weights; level: veto → negative; else
`≥ high` → high; `≥ medium` → medium; `≥ 0` → low; `< 0` → negative.

## Architecture

Self-contained editor on the Settings page. No `UIContext` changes — the
add-keyword modal keeps local open state, since the whole feature lives on one
page. All reads come from `useScoringConfig`; all writes go through the existing
mutation hooks, which keep the `['scoring-config']` cache in sync. Because every
unit reads that one cache, edits reflect live in the preview and (via `useJobs`)
in the Inbox.

## Components

New, under `src/components/`, each with a co-located `.spec.tsx`.

### `ScoringConfigEditor`

Section container. Calls `useScoringConfig()`, renders `ThresholdsForm`,
`KeywordList`, and `ScorePreview` (in that order). Rendered inside the Settings
page's score `<section>`. Holds the `AddKeywordModal` open state and renders the
modal.

### `ThresholdsForm`

Two integer steppers: "Alta ≥" (`highThreshold`) and "Média ≥"
(`mediumThreshold`). On change, calls `useUpdateScoringSettings` with both current
values. Guard: when the user lowers high below medium (or raises medium above
high), clamp the other value so `medium ≤ high` always holds — clamp silently,
no error message. Values are integers; the stepper changes by 1.

### `KeywordList`

Receives `keywords: ScoringKeyword[]`. Splits into two groups:

- **Vetos** — `is_veto === true`, sorted by `term` ascending.
- **Pontuação** — the rest, sorted by `weight` descending, then `term` ascending.

Renders a labelled group heading for each non-empty group and a `KeywordRow` per
keyword. Below the groups, an "+ Adicionar palavra" button opens the modal
(callback prop from `ScoringConfigEditor`).

### `KeywordRow`

Receives one `ScoringKeyword`. Layout: `term` (text) · weight stepper (`−`/value/`+`,
**hidden when `is_veto`** since weight is ignored) · veto `Toggle` (reuses
`src/components/Toggle/Toggle.tsx`) · "Excluir".

- Weight `+`/`−` → `useEditScoringKeyword({ ...keyword, weight: keyword.weight ± 1 })`.
- Veto toggle → `useEditScoringKeyword({ ...keyword, is_veto: next })`.
- Excluir → `useDeleteScoringKeyword(keyword.id)`.
  Each fires immediately (no local Save); the cache sync re-renders the row. No
  inline term editing — rename = delete + re-add.

### `AddKeywordModal`

`AddCompanyModal`-style dialog (`role="dialog"`, backdrop, Cancelar/Adicionar).
Fields: `term` (required text), initial weight (integer stepper, default 1), veto
`Toggle` (default off; when on, the weight field is hidden). Submit →
`useAddScoringKeyword({ term, weight, is_veto })` then close. Open state owned by
`ScoringConfigEditor`.

### `ScorePreview`

A `textarea` ("Cole o título/descrição de uma vaga"). On every keystroke,
computes `computeRelevanceScore({ title: text, description: null }, config)` with
the current `useScoringConfig` data and shows the numeric `score` plus a
`<ScoreBadge level={...}>`. Pure client-side, no persistence. Empty input shows
the score for empty text (score 0, level `low`).

## Data flow

```
useScoringConfig ──▶ ScoringConfigEditor ──▶ ThresholdsForm  ─(useUpdateScoringSettings)─┐
                                          ├─▶ KeywordList ─▶ KeywordRow ─(useEdit/Delete)─┤
                                          ├─▶ AddKeywordModal ─(useAddScoringKeyword)─────┤
                                          └─▶ ScorePreview (computeRelevanceScore, read)  │
                                                                                          ▼
                                                              setQueryData ['scoring-config']
                                                                                          │
                                          ◀───────────── all units re-read the cache ─────┘
```

## SettingsPage integration

Replace the disabled score `<section>` body (the two disabled textareas + "Em
breve (#43)" text) with `<ScoringConfigEditor />`. Keep the `<h2>Cálculo de
score</h2>` heading and the surrounding section styling. The theme `<section>`
(#44) is unchanged.

## Error handling

Mutations follow the existing hooks' behavior (write → cache sync; no optimistic
rollback, matching Companies). No new error UI in v1 — a failed write simply
leaves the prior cache value, consistent with the rest of the app. Threshold
clamping is the only client-side validation.

## Testing

Co-located Vitest + React Testing Library specs. Components using mutation/query
hooks are wrapped in a fresh `QueryClientProvider` per test (per repo
convention).

- `KeywordRow.spec.tsx` — weight `+`/`−` calls edit with the new weight; veto
  Toggle calls edit with flipped `is_veto`; Excluir calls delete with the id;
  weight stepper is absent when `is_veto`.
- `KeywordList.spec.tsx` — vetoes and scored keywords land in their groups;
  Pontuação sorted by weight desc; add button invokes its callback.
- `AddKeywordModal.spec.tsx` — submitting calls `useAddScoringKeyword` with the
  entered term/weight/veto; weight field hidden when veto is on; Cancelar closes.
- `ThresholdsForm.spec.tsx` — changing a stepper calls `useUpdateScoringSettings`
  with both values; medium clamps to high (and vice-versa).
- `ScorePreview.spec.tsx` — typing a title with strong keywords shows the
  expected score and level badge; recomputes when the cached config changes.
- `SettingsPage.spec.tsx` (update) — the score section is no longer disabled;
  assert the editor renders (score heading + "Adicionar palavra" + the preview).
  Theme assertions unchanged.

## Out of scope

- Theme selector (#44).
- Per-user config / auth (backend already modeled for it; UI stays on the global
  row).
- Inline keyword renaming, bulk import/export, drag-reorder.
- Optimistic-with-rollback mutation UX (not used elsewhere in the app).
