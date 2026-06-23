# New Color Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the new five-color palette (#1) app-wide with a cool/slate dark surface treatment, via Tailwind v4 `@theme` color-token overrides — no component edits, no shadcn.

**Architecture:** The app uses a small, fixed set of Tailwind color utilities. Redefining each used `--color-<name>-<shade>` inside a single `@theme` block in `src/index.css` re-points every existing utility (`bg-gray-950`, `text-green-400`, …) to the new palette. Badges and surfaces adopt the palette automatically; no JSX changes.

**Tech Stack:** Tailwind CSS v4 (`@import 'tailwindcss'`), Vite 8, React 19, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-23-new-palette-design.md`

## Global Constraints

- **No shadcn / no new dependencies.** Delivery is CSS-only (`src/index.css`).
- **Five brand anchors are exact:** green `#90eda2`, yellow `#edd791`, pink `#ed919e`, blue `#91a0ed`, gray `#616562`.
- **No component JSX/structure changes**; only `src/index.css` is touched (a one-off utility swap on a single element is allowed only if the visual smoke reveals a problem).
- **Existing tests must stay green** — they assert text, not color classes; no test edits.
- **Dark direction A** surfaces (cool/slate): background `#0f1115`, card `#181b21`, border `#272b33`.
- Commit after the task with the message in its final step.

---

## File Structure

**Modified:**

- `src/index.css` — add one `@theme` block overriding the in-use Tailwind color tokens + brand tokens.

No other files change.

---

## Task 1: Remap Tailwind color tokens to the new palette

**Files:**

- Modify: `src/index.css`

**Interfaces:**

- Produces: overridden Tailwind color scale (gray/blue/green/emerald/yellow/amber/red) + `--color-brand-*` tokens, consumed by all existing utility classes.

- [ ] **Step 1: Confirm the current file** — `src/index.css` is currently a single line: `@import 'tailwindcss';`. Read it to confirm before editing.

- [ ] **Step 2: Add the `@theme` override block** — make `src/index.css`:

```css
@import 'tailwindcss';

/* New palette (#1), cool/slate dark (direction A).
   Overriding the in-use Tailwind color tokens re-points every existing
   utility (bg-gray-950, text-green-400, …) — no component edits needed. */
@theme {
  /* Neutrals → direction-A cool dark surfaces */
  --color-gray-950: #0f1115;
  --color-gray-900: #181b21;
  --color-gray-800: #272b33;
  --color-gray-700: #3a3f49;
  --color-gray-600: #5b616b;
  --color-gray-500: #7c828d;
  --color-gray-400: #9aa0ab;
  --color-gray-300: #c7ccd4;
  --color-gray-200: #e7e9ee;

  /* Blue → brand blue #91a0ed (primary / links) */
  --color-blue-600: #7d8ee8;
  --color-blue-500: #91a0ed;
  --color-blue-400: #a3b0f0;
  --color-blue-300: #b8c2f4;

  /* Green / emerald → brand green #90eda2 (high relevance / success) */
  --color-green-500: #90eda2;
  --color-green-400: #a6f1b4;
  --color-emerald-600: #7fe095;
  --color-emerald-500: #90eda2;

  /* Yellow / amber → brand yellow #edd791 (medium relevance) */
  --color-yellow-500: #edd791;
  --color-yellow-400: #f1dea3;
  --color-amber-400: #edd791;

  /* Red → brand pink #ed919e (negative / dismiss / destructive) */
  --color-red-500: #ed919e;
  --color-red-400: #f0a3ae;
  --color-red-300: #f4b8c0;

  /* Brand tokens for future semantic use (e.g. #9) */
  --color-brand-green: #90eda2;
  --color-brand-yellow: #edd791;
  --color-brand-pink: #ed919e;
  --color-brand-blue: #91a0ed;
  --color-brand-gray: #616562;
}
```

- [ ] **Step 3: Verify the build picks up the overrides**

Run: `npm run build`
Expected: `tsc -b && vite build` succeeds. If Vite/Tailwind v4 errors on the `@theme` override form, consult the Tailwind v4 docs (the override of a default `--color-*-*` inside `@theme` is supported) and adjust the block — do not change the five brand anchor values.

- [ ] **Step 4: Verify the existing suite stays green**

Run: `npm run test:run`
Expected: PASS (169 tests; specs assert text, not color classes, so the remap doesn't affect them).

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: 0 errors (the pre-existing `UIContext.tsx` warning is unrelated).

- [ ] **Step 6: Commit**

```bash
git add src/index.css
git commit -m "feat: apply new color palette via theme-token remap (#1)"
```

---

## Task 2: Visual smoke + finalize

**Files:** none (verification + optional shade nudge in `src/index.css`).

- [ ] **Step 1: Run the app and eyeball both pages**

Run: `npm run dev` (then open the served URL).
Check on **Dashboard** and **Wishlist**:

- Background/surfaces are the new cool dark (direction A), not the old gray.
- Relevance badges read green (Alta) / yellow (Média) / gray (Baixa) / pink (Negativa).
- Links and primary buttons are brand blue; `RunScraperButton` is green; the `SourceCard` "falhou" tone is warm (amber→yellow).
- No illegible text or low-contrast surface (e.g. card vs background still distinguishable; muted text still readable).

- [ ] **Step 2: Nudge shades only if a problem is found**

If any surface/text reads poorly, adjust the offending `--color-*` value in `src/index.css` (keep the five brand anchors exact), re-run `npm run build`, and re-check. If everything reads well, make no change.

- [ ] **Step 3: Commit any nudge (skip if none)**

```bash
git add src/index.css
git commit -m "style: adjust palette shades after visual smoke (#1)"
```

- [ ] **Step 4: Record #1 closure**

After merge, comment on #1 that the palette is applied app-wide via theme tokens and close it. (The remaining shadcn-related component work is not a dependency — #8 was declined.)

---

## Self-Review Notes

- **Spec coverage:** the `@theme` remap (spec §"Approach") → Task 1; brand anchors exact → Global Constraints + Task 1; manual visual smoke (spec §Testing) → Task 2; no component edits / tests-stay-green (spec §"Component changes"/Testing) → Task 1 Steps 4–5.
- **No placeholders:** every override value is concrete; the only conditional is the visual-smoke nudge (Task 2 Step 2), which is inherently judgment-based and bounded ("keep the five brand anchors exact").
- **Inventory match:** the overridden shades (gray 200–950; blue 300–600; green 400/500; emerald 500/600; yellow 400/500; amber 400; red 300/500) exactly match the color utilities found in `src/**/*.tsx`.
- **Risk noted:** if Tailwind v4 rejects the override form, Task 1 Step 3 directs a docs-based fix without touching the brand anchors.
