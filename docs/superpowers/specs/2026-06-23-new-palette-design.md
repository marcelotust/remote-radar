# New Color Palette — Design

**Issue:** [#1](https://github.com/marcelotust/remote-radar/issues/1) (modify color palette)
**Date:** 2026-06-23
**Status:** Approved (brainstorming)

## Objective

Apply the new five-color palette (#1) across the app with a **cool/slate dark**
surface treatment (visual-companion direction A), with minimal component churn.

shadcn/ui was evaluated and declined for the app's current size (see #8) — this is
delivered as **theme tokens only**, no UI library.

## Decisions (from brainstorming)

1. **No shadcn** — palette via Tailwind v4 `@theme` token overrides. The accessible
   modal #9 needs will use Radix Dialog directly when #9 is built.
2. **Dark direction A** (cool/slate) chosen in the visual companion.
3. **Palette → roles:** blue `#91A0ED` = primary/links; green `#90EDA2` = high
   relevance / success; yellow `#EDD791` = medium relevance; pink `#ED919E` =
   negative / dismiss / destructive; gray `#616562` anchors the neutral scale.

## Approach: remap Tailwind color tokens

The app uses a small, fixed set of Tailwind color utilities (inventory below). In
Tailwind v4, redefining a color's `--color-<name>-<shade>` variable inside `@theme`
in `src/index.css` changes every utility that references it. So the palette is
delivered almost entirely in CSS — existing `bg-gray-950`, `text-green-400`,
`bg-blue-600`, etc. adopt the new colors with **no component edits**, badges
included.

### Color inventory (from `src/**/*.tsx`)

- **Neutrals (gray):** 950, 900, 800, 700, 600, 500, 400, 300, 200 + `white`.
- **Accents:** blue 600/500/400/300; green 500/400; red 500/400/300; yellow 500/400;
  amber 400; emerald 600/500.

### `@theme` overrides (`src/index.css`)

Neutral scale → direction-A cool dark:

```css
@theme {
  --color-gray-950: #0f1115; /* app background */
  --color-gray-900: #181b21; /* cards / surfaces */
  --color-gray-800: #272b33; /* borders / inputs */
  --color-gray-700: #3a3f49; /* borders / dividers */
  --color-gray-600: #5b616b; /* muted */
  --color-gray-500: #7c828d; /* muted text */
  --color-gray-400: #9aa0ab; /* secondary text */
  --color-gray-300: #c7ccd4; /* text */
  --color-gray-200: #e7e9ee; /* high-emphasis text */
}
```

Accents → palette (map each used shade of a hue to the brand color; lighter shades
may use a slightly lighter variant for hover/links):

```css
@theme {
  /* blue → brand blue #91A0ED (primary / links) */
  --color-blue-600: #7d8ee8; /* solid primary (slightly deeper) */
  --color-blue-500: #91a0ed;
  --color-blue-400: #a3b0f0; /* links */
  --color-blue-300: #b8c2f4; /* link hover */

  /* green → brand green #90EDA2 (high relevance / success) */
  --color-green-500: #90eda2;
  --color-green-400: #a6f1b4;
  --color-emerald-600: #7fe095; /* RunScraperButton */
  --color-emerald-500: #90eda2;

  /* yellow / amber → brand yellow #EDD791 (medium relevance) */
  --color-yellow-500: #edd791;
  --color-yellow-400: #f1dea3; /* slightly lighter for solid text */
  --color-amber-400: #edd791; /* SourceCard "falhou" tone stays warm */

  /* red → brand pink #ED919E (negative / dismiss / destructive) */
  --color-red-500: #ed919e;
  --color-red-400: #f0a3ae;
  --color-red-300: #f4b8c0;
}
```

Plus **brand tokens** for future semantic use (e.g. #9):

```css
@theme {
  --color-brand-green: #90eda2;
  --color-brand-yellow: #edd791;
  --color-brand-pink: #ed919e;
  --color-brand-blue: #91a0ed;
  --color-brand-gray: #616562;
}
```

> The exact lighter/darker variants (e.g. `blue-600` deeper, `yellow-400` lighter)
> are nailed down in the plan; the values above are the agreed anchors and may be
> nudged during the visual smoke check. Keep the five brand anchors exact.

## Component changes

None required for the color swap — the remap covers all current usages. The only
allowed touch-ups (if the visual smoke reveals a problem) are swapping a one-off
utility on a single element; no structural/JSX changes, no new components.

## Out of scope

- shadcn/ui adoption (declined — #8).
- The compact card + Radix modal (#9).
- A light theme / theme toggle (app is dark-only).
- Layout/spacing changes.

## Error handling / risks

- **Remapping the whole gray scale** could shift contrast somewhere unexpected; the
  manual visual smoke (every page) is the safety net. Direction-A values were chosen
  to stay close to the current dark feel.
- **Tailwind v4 `@theme` override semantics** — redefining a default `--color-*-*`
  must actually re-point the utility. Verified by the visual smoke + a token test
  (below). If v4 requires a specific form, the plan adjusts per Tailwind v4 docs.

## Testing & verification

- **Token test** `src/index.spec.ts(x)` is overkill; instead verify via the build +
  a focused check: the existing component specs assert **text**, not color classes,
  so they stay green after the remap — no test edits needed.
- `npm run build` (`tsc -b && vite build`), `npm run test:run`, `npm run lint` green.
- **Manual visual smoke** on Dashboard + Wishlist: dark direction-A surfaces;
  relevance badges green/yellow/gray/pink; links/primary blue; `RunScraperButton`
  green; no contrast/legibility regression.

## Implementation order

1. Add the `@theme` block (neutral remap + accent remap + brand tokens) to
   `src/index.css`.
2. Run build + tests + lint; do the manual visual smoke and nudge any shade that
   reads poorly.
3. Note partial vs full delivery on #1 and close it (no remaining shadcn dependency).
