# shadcn/ui Foundation + New Palette — Design

**Issues:** [#37](https://github.com/marcelotust/remote-radar/issues/37) (shadcn #8a foundation, part of [#8](https://github.com/marcelotust/remote-radar/issues/8)) + [#1](https://github.com/marcelotust/remote-radar/issues/1) (new color palette)
**Date:** 2026-06-23
**Status:** Approved (brainstorming)

## Objective

Lay the shadcn/ui foundation (init + the primitives the compact-card/modal work in
#9 needs) and apply the new color palette from #1 — without the full component
migration (that is #8b / #38). Deliver a visible win: the app adopts the new dark
background and the relevance/remote badges adopt the new palette.

## Decisions (from brainstorming)

1. **Theme wiring:** dark via a `dark` class on `<html>`; the palette lives in the
   shadcn token set + Tailwind `@theme` brand tokens — not a hand-tuned override of
   the gray scale. (Visual companion: **direction A — cool/slate dark** chosen.)
2. **Visible scope of #8a:** foundation + primitives + the new dark background applied
   to the app + retheme the two presentational badges (`ScoreBadge`,
   `RemoteBrazilBadge`). The rest of the component migration is #8b.
3. **Palette → roles:** blue `#91A0ED` = primary/links; green `#90EDA2` = high
   relevance / success; yellow `#EDD791` = medium relevance; pink `#ED919E` =
   negative / dismiss / destructive; gray `#616562` = low / neutral.

## Stack note

Tailwind **v4** (CSS-first, `@import 'tailwindcss'` in `src/index.css`, no
`tailwind.config.js`), React 19, Vite 8. shadcn init follows the Tailwind-v4 path
(CSS variables, no JS config). There is currently **no `@/*` path alias**. The
implementation plan will use the **`vercel:shadcn`** skill to confirm exact CLI
commands/flags for Tailwind v4 + React 19.

## Architecture

### 1. Tooling & setup

- **Path alias `@/*` → `src/*`:** add `compilerOptions.baseUrl` + `paths` to the
  TypeScript config(s) and a matching `resolve.alias` in `vite.config.ts` (via
  `node:path` `fileURLToPath`). shadcn imports use `@/components/ui/...` and
  `@/lib/utils`.
- **`shadcn init`** (Tailwind-v4 flow): writes `components.json` (style, baseColor
  `slate` as the starting neutral, CSS-variables mode, the `@/` aliases), creates
  `src/lib/utils.ts` (the `cn` helper), and injects the token blocks into
  `src/index.css`. Adds `clsx` + `tailwind-merge` (+ `tw-animate-css` or the v4
  equivalent the CLI chooses) as dependencies.
- **Primitives:** `Button`, `Card`, `Dialog`, `Badge` added under
  `src/components/ui/`.
- **Enable dark:** add `class="dark"` to `<html>` in `index.html`.

### 2. Theme tokens (`src/index.css`)

- **Brand tokens** via Tailwind v4 `@theme` (so `text-brand-*` / `bg-brand-*`
  utilities exist):
  ```css
  @theme {
    --color-brand-green: #90eda2;
    --color-brand-yellow: #edd791;
    --color-brand-pink: #ed919e;
    --color-brand-blue: #91a0ed;
    --color-brand-gray: #616562;
  }
  ```
- **shadcn dark tokens** (direction A — values are the agreed starting point; the
  plan may nudge shades during the visual smoke check): `--background #0f1115`,
  `--card #181b21`, `--popover #181b21`, `--border #272b33`, `--input #272b33`,
  `--foreground #e7e9ee`, `--muted-foreground #9aa0ab`, `--primary #91a0ed`
  (foreground dark), `--destructive #ed919e`. Light-mode tokens stay at the CLI
  defaults (the app runs in dark; light is not used).

### 3. Visible retheme

- **Background:** swap the root `bg-gray-950` on `DashboardPage` and `WishlistPage`
  (and `NavBar`'s surface classes) for the token-driven `bg-background` /
  `text-foreground` so the new dark applies app-wide. Keep existing layout/spacing
  classes.
- **`ScoreBadge`** (`src/components/ScoreBadge/ScoreBadge.tsx`): map levels to brand
  tokens — `high → bg-brand-green/15 text-brand-green`, `medium → bg-brand-yellow/15
text-brand-yellow`, `low → bg-brand-gray/15 text-brand-gray`, `negative →
bg-brand-pink/15 text-brand-pink`. Labels unchanged.
- **`RemoteBrazilBadge`**: `yes → green`, `unknown → gray`, `no → pink` (same
  tint/text pattern). Labels unchanged.

### 4. Scope boundaries

- **#8b (#38)** owns: `FilterBar` selects/checkboxes → `Select`/`Switch`;
  `AddCompanyModal`/`AddSourceModal` → `Dialog` + inputs; `StatusDropdown` →
  `Select`/`DropdownMenu`; `NetworkingButton` and other buttons → `Button`;
  `SourceCard`/`CompanyCard`/`RunScraperButton` → primitives.
- **#1** is mostly delivered here (background + relevance/remote badges). The
  remaining accent usages land with #8b — a note on #1 records this; #1 closes after
  #8b.
- No data/schema/type change.

## Error handling / risks

- **shadcn base layer:** the Tailwind-v4 init adds `@layer base` rules (e.g. `body {
@apply bg-background text-foreground }`). Combined with the `dark` class and the
  direction-A tokens this makes the body dark; the per-page `bg-background` swap keeps
  surfaces consistent. The visual smoke check confirms no regression (no light flashes,
  badges legible).
- **React 19 peer deps:** if the shadcn CLI/`add` hits peer-dep friction with React 19,
  the plan resolves it per the `vercel:shadcn` guidance (e.g. the CLI's React-19 prompt
  / `--legacy-peer-deps`) rather than downgrading anything.
- **Alias must resolve in three places:** Vite (runtime/build), TypeScript
  (`typecheck`/editor), and Vitest. Vitest reads `vite.config.ts` plugins but a custom
  `resolve.alias` must also be picked up by the test run — verify a test importing
  `@/components/ui/button` resolves.

## Testing & verification

- **Smoke test** `src/components/ui/button.spec.tsx` (or similar): render the shadcn
  `Button` and assert it appears — proves the `@/` alias + tokens + component resolve
  under Vitest.
- **Existing badge specs** (`ScoreBadge`/`RemoteBrazilBadge`) assert on **text**, not
  color classes, so the retheme keeps them green; no test edits required for the color
  swap.
- `npm run build` (`tsc -b && vite build`), `npm run test:run`, `npm run lint` all
  green.
- **Manual visual smoke:** load the app — dark background (direction A), relevance
  badges in green/yellow/gray/pink, links/primary in blue. Confirm no structural
  regression.

## Out of scope

- Migrating the remaining components to shadcn primitives (#8b / #38).
- A light theme / theme toggle (app is dark-only).
- Restyling layout/spacing beyond the background + badge color swap.
- The compact card + detail modal (#9) — it consumes these primitives next.

## Implementation order

1. Path alias (tsconfig + vite) + verify a trivial `@/` import resolves in build &
   test.
2. `shadcn init` (Tailwind-v4) + add `Button`/`Card`/`Dialog`/`Badge`; `dark` class on
   `<html>`.
3. Brand `@theme` tokens + direction-A dark token values in `index.css`.
4. Apply `bg-background` to page roots / NavBar.
5. Retheme `ScoreBadge` + `RemoteBrazilBadge` to brand tokens.
6. Smoke test + full verification; note partial delivery on #1.
