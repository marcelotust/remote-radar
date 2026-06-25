# Textarea-bucket score editor (#43 follow-up)

## Goal

Replace the inline keyword editor (per-row `+`/`−` steppers, veto toggle, delete,
add-modal) with four comma-separated **textareas** ("baldes"), one per weight
tier. Simpler to scan and bulk-edit, brings back negative-weight terms, and fixes
the dead `+`/`−` buttons at the root.

## Background: why the +/- buttons are dead today

`useScoringConfig` falls back to the in-memory `DEFAULT_SCORING_CONFIG` whenever
the Supabase `scoring_keywords` table returns no rows. Those default keywords are
`ScoringRule` objects with **no `id`**. `KeywordRow`'s edit/delete call
`supabase.update(...).eq('id', keyword.id)` / `delete().eq('id', id)` with
`id === undefined`, which matches no rows and silently no-ops. So when the table
is empty (e.g. the new schema seed was never run), nothing is editable even
though the Inbox still scores correctly off the defaults.

The new design sidesteps ids entirely: Save writes the **whole** keyword set by
replacing the table contents, so there are no per-row ids to go stale and an
empty table is populated on first Save.

## Buckets

Four tiers, weight implied by the bucket:

| Bucket            | Stored as                    |
| ----------------- | ---------------------------- |
| Veto              | `is_veto: true, weight: 0`   |
| Positivo forte +2 | `is_veto: false, weight: 2`  |
| Positivo fraco +1 | `is_veto: false, weight: 1`  |
| Negativo −1       | `is_veto: false, weight: -1` |

## Components

### `KeywordBuckets` (new) — `src/components/KeywordBuckets/`

- Reads `useScoringConfig()`.
- Derives four strings from `config.keywords` by classifying each keyword
  (terms joined by `, `, in stable order — input order):
  - **Veto**: `is_veto === true`
  - **+2**: `!is_veto && weight >= 2`
  - **+1**: `!is_veto && weight === 1` (and any leftover `weight === 0`)
  - **−1**: `!is_veto && weight <= -1`
- Holds the four strings in local state, seeded from the config via `useEffect`
  on the config value so external changes re-seed the textareas.
- Renders four labelled `<textarea>`s (Neon Bubble styling) and a **"Salvar"**
  button.
- On Save: parse each textarea → `parseTerms(str)` (split on `,`, `.trim()`,
  `.toLowerCase()`, drop blanks, dedupe within the field), then build the full
  `ScoringRule[]`:
  - veto terms → `{ term, weight: 0, is_veto: true }`
  - +2 / +1 / −1 terms → `{ term, weight, is_veto: false }`
  - If the same term appears in multiple buckets, the first bucket in the order
    [veto, +2, +1, −1] wins (dedupe across buckets so a term is written once).
  - Calls `useReplaceScoringKeywords().mutate(rules)`.

### `parseTerms` helper

Pure function (co-located in `KeywordBuckets.tsx` or a small util): `string =>
string[]`. Split on comma, trim, lowercase, filter empties, dedupe.

### `ScoringConfigEditor` (modify)

Compose `ThresholdsForm` + `KeywordBuckets` + `ScorePreview`. Drop the
`AddKeywordModal` / `KeywordList` / local modal state.

### Removed

`KeywordList`, `KeywordRow`, `AddKeywordModal` and their specs (replaced).

## Hook: `useReplaceScoringKeywords`

Added to `src/hooks/useScoringConfigMutations.ts`.

- Input: `rules: ScoringRule[]` (full desired global set).
- Implementation (full replace):
  1. `await supabase.from('scoring_keywords').delete().is('user_id', null)`
  2. `await supabase.from('scoring_keywords').insert(rules.map((r) => ({ ...r, user_id: null })))`
  3. Throw on either error.
- `onSuccess`: `qc.invalidateQueries({ queryKey: SCORING_CONFIG_KEY })` so the
  config refetches the freshly-inserted rows (with real ids).

### Supabase fake change

`src/lib/__mocks__/supabase.ts` `insert` currently accepts a single `Row` and
pushes one row. Extend it to accept `Row | Row[]`: when given an array, push each
row (each gets its own `id` + `created_at`) and return the array; keep
single-row behavior otherwise. This matches PostgREST's array-insert.

## What stays unchanged

- `ThresholdsForm` — still auto-persists on change (single-number steppers;
  immediate persist is appropriate). Keywords use an explicit Save; this mixed
  model is intentional and approved.
- `ScorePreview` — unchanged.
- The scoring engine, schema, and the other mutation hooks
  (`useAdd/Edit/DeleteScoringKeyword`) — the edit/delete hooks are no longer used
  by the UI but remain (still covered by their hook tests); only the three UI
  components are removed.

## Error handling

Matches the app convention: mutation error leaves the prior cache; no new error
UI. The full-replace is two sequential writes; if the insert fails after the
delete, the table could be left empty — acceptable for a single-user config in
v1 (the user re-saves). Noted as a known limitation, not handled with a
transaction in v1.

## Testing

- `KeywordBuckets.spec.tsx`
  - Pre-fills the four textareas from a seeded config (veto/+2/+1/−1 terms land
    in the right boxes).
  - `parseTerms`: commas, surrounding whitespace, mixed case, blanks, dedupe.
  - Editing a textarea + clicking Salvar calls the replace mutation with the full
    parsed `ScoringRule[]` (correct weights/veto flags); cross-bucket dedupe
    keeps the first bucket.
- `useScoringConfigMutations.spec.tsx` (extend) — `useReplaceScoringKeywords`
  replaces the table contents (via the fake) and `useScoringConfig` then reflects
  exactly the new set; also works starting from an empty table.
- `ScoringConfigEditor.spec.tsx` (update) — asserts the bucket textareas render
  (e.g. a "Veto" textarea) instead of the old add button / keyword rows.
- `SettingsPage.spec.tsx` (update) — editor-render assertion targets a bucket
  textarea + the preview (no "Adicionar palavra" button).
- Delete `KeywordList`, `KeywordRow`, `AddKeywordModal` specs with their
  components.

## Out of scope

- Arbitrary per-keyword weights beyond the four tiers (the simplification is the
  point; loading normalizes existing weights into the nearest bucket).
- Transactional safety of the two-step replace.
- Theme section (#44).
- Per-user config / auth.
