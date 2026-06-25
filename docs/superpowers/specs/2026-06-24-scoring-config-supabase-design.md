# Configurable scoring persisted in Supabase (#43)

## Goal

Make relevance scoring **configurable and persisted in Supabase** instead of
hardcoded in `src/utils/keywords.ts`, and upgrade the scoring model from a
simple positive/negative count to **weighted keywords + hard vetoes**. The
config is edited from the Settings page (#19) and is modeled to become
**per-user** in the future.

## Scoring model

Each keyword carries a numeric `weight` and an `is_veto` flag.

- `score` = sum of `weight` for every matched **non-veto** keyword.
- Level mapping:
  - any matched **veto** keyword → `negative` (overrides everything)
  - else `score >= high_threshold` → `high`
  - else `score >= medium_threshold` → `medium`
  - else `score >= 0` → `low`
  - else (`score < 0`) → `negative`

Phrase matching (`"100% remote"`, `"worldwide remote"`) already works through the
existing `matchesKeyword` lookaround regex in `src/utils/scoring.ts`, which
escapes special characters and uses `(?<![a-z0-9])…(?![a-z0-9])` boundaries. No
matcher change is required.

## Schema (`supabase/schema.sql`)

Modeled for future per-user config: `user_id` nullable, `null` = global default.
The app reads global rows now; when auth lands, queries filter by `user_id` with
the global row as fallback.

```sql
create table if not exists scoring_keywords (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  term       text not null,
  weight     int  not null default 1,
  is_veto    boolean not null default false,
  created_at timestamptz default now(),
  unique (user_id, term)
);

create table if not exists scoring_settings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique,
  high_threshold   int not null default 4,
  medium_threshold int not null default 1,
  created_at       timestamptz default now()
);
```

RLS mirrors the existing tables: anon `read` + `insert`/`update`/`delete`, so the
Settings page (#19) can edit using the anon key.

### Seed (default global config, `user_id = null`)

Weights: strong = `2`, weak = `1`. Vetoes ignore weight.

- **Veto** (`is_veto = true`): `presencial`, `híbrido`, `hybrid`, `on-site`,
  `onsite`, `java`, `php`, `cobol`, `.net`, `c#`, `golang`
- **Strong positive (+2):** `react`, `remote`, `worldwide remote`,
  `remote worldwide`, `100% remote`, `frontend`, `front-end`, `typescript`
- **Weak positive (+1):** `reactjs`, `next.js`, `nextjs`, `tailwind`, `node`,
  `rails`, `css`, `javascript`, `js`, `figma`, `ux`, `ui`, `hotwire`, `worldwide`

`scoring_settings` seed: one global row, `high_threshold = 4`,
`medium_threshold = 1`.

## Types (`src/types/index.ts`)

```ts
export interface ScoringKeyword {
  id: string
  user_id: string | null
  term: string
  weight: number
  is_veto: boolean
  created_at: string
}

export interface ScoringSettings {
  id: string
  user_id: string | null
  high_threshold: number
  medium_threshold: number
  created_at: string
}

// Resolved shape consumed by scoring + UI
export interface ScoringConfig {
  keywords: ScoringKeyword[]
  highThreshold: number
  mediumThreshold: number
}
```

The old `KeywordConfig` interface is retired (or kept only if still referenced).
`keywords.ts` exposes `DEFAULT_SCORING_CONFIG: ScoringConfig` mirroring the seed,
used as fallback when Supabase returns no rows.

## scoring.ts

`computeRelevanceScore(job, config: ScoringConfig)`:

- Build `text = (title + ' ' + description).toLowerCase()`.
- Find matched keywords via existing `matchesKeyword`.
- If any matched keyword has `is_veto` → `level = 'negative'` (score still
  computed from matched non-veto weights for transparency, but level is forced).
- Else `score = sum(weight of matched non-veto keywords)` and map via thresholds
  (`config.highThreshold`, `config.mediumThreshold`).

## Hooks

- **`useScoringConfig`** (`src/hooks/useScoringConfig.ts`) — `useQuery` keyed
  `['scoring-config']`, reads `scoring_keywords` + `scoring_settings`, merges into
  a resolved `ScoringConfig`. Falls back to `DEFAULT_SCORING_CONFIG` when empty
  (no keyword rows → default keywords; no settings row → default thresholds).
- **`useScoringConfigMutations`** — `addKeyword` / `editKeyword` /
  `deleteKeyword` / `updateSettings`, each doing the Supabase write then
  `setQueryData` cache sync, following the `useCompanyMutations` pattern.

## useJobs integration

`useJobs` consumes `useScoringConfig` and passes the resolved config into
`enrichJobs` → `computeRelevanceScore`.

**Behavior change (approved):** drop the `hasStored` short-circuit in
`enrichJobs`. Scores are **always recomputed client-side** from the active
config so Settings tuning is authoritative on what the user sees. The stored
`relevance_score` / `relevance_level` columns remain for the scraper but no
longer override client display.

## Tests / fake

- Add `scoring_keywords` + `scoring_settings` to the Supabase fake seed
  (`src/lib/__mocks__/supabase.ts`) and `MOCK_SCORING_KEYWORDS` /
  `MOCK_SCORING_SETTINGS` in `src/data/mockData.ts`.
- Tests:
  - `scoring.spec.ts` — weighted sums, veto override, threshold boundaries,
    phrase matching.
  - `useScoringConfig.spec.tsx` — reads config, fallback to default when empty.
  - `useScoringConfigMutations.spec.tsx` — add/edit/delete keyword, update
    thresholds, cache sync.
  - `useJobs.spec.tsx` — jobs reflect the loaded config; recompute on config
    change; veto forces `negative`.

## Acceptance criteria (from #43)

- [x] Score config persists in Supabase and is read by the app.
- [x] `computeRelevanceScore` uses the Supabase config with default fallback.
- [x] Schema modeled to evolve to per-user (`user_id` + RLS).
- [x] Read + mutation hooks with tests; Supabase fake updated.

## Out of scope

- The Settings UI itself (#19) — this spec delivers schema + hooks + scoring; the
  page wires into `useScoringConfig` / `useScoringConfigMutations`.
- Real authentication / per-user enforcement — schema is ready, enforcement
  lands with auth.
