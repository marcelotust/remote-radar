# Scraper pipeline efficiency: concurrency + configurable timeout (#27)

## Problem

On the first production run, 45 sources hit a `waitForSelector` timeout of 15s
**in series** → ~11 min of pure waiting, mostly on sources that never resolve.
Two root causes remain after #26 disabled the unviable sources:

1. **Serial render** — `runScrape` loops `for...of` with `await` per source, so
   each slow source blocks the next.
2. **Fixed 15s timeout** — `renderPage` hardcodes `timeoutMs = 15000`, generous
   for sources that never render their ready selector.

Scope is **concurrency + timeout only**. The third task in the issue
(standardize source URLs to listing pages) is out of scope: after #26 the only
remaining root URLs are the Lever/Greenhouse ATS roots, which belong to #25; the
rest are already handled per-adapter.

## Goals

- Render sources concurrently with a bounded limit so one slow source no longer
  blocks the others.
- Lower the default render timeout and make both timeout and concurrency
  configurable via environment variables.
- Cover concurrency with a test in `pipeline.ts` using injected deps (no browser).
- Keep the public `runScrape(deps)` contract and all 8 existing pipeline tests
  passing unchanged.

## Design

### 1. Worker pool in `scraper/pipeline.ts`

Extract the current per-source loop body into a local async function:

```
processSource(source) -> Promise<{ result: SourceRunResult; extracted: number }>
```

It keeps today's exact logic — resolve adapter, fetch via `adapter.fetch` or
`renderPage(adapter.readySelector)`, parse, filter by recency, score, map to
`JobRow`, `upsertJobs`, then `recordSourceRun` — and its own try/catch so a
failing source is isolated. It returns the per-source result plus the extracted
count instead of mutating outer counters.

Run `processSource` over all sources with a simple bounded worker pool (no new
dependency):

```ts
const results = new Array<{ result: SourceRunResult; extracted: number }>(sources.length)
let next = 0
const worker = async (): Promise<void> => {
  while (true) {
    const i = next++
    if (i >= sources.length) return
    results[i] = await processSource(sources[i])
  }
}
const workerCount = Math.min(concurrency, sources.length)
await Promise.all(Array.from({ length: workerCount }, worker))
```

Writing each result at its source index keeps `perSource` in input order, so the
existing order-dependent assertions (`perSource[0]`, `perSource[1]`) still hold.
After the pool finishes, fold `results` into `extracted` / `inserted` /
`failedSources` and build the `ScrapeSummary`.

`concurrency` is added as an **optional** field on `PipelineDeps`, defaulting to
`5` when omitted. Because it is optional, every existing caller and test compiles
and behaves identically (a single source with concurrency 5 still runs once).

### 2. Configurable timeout in `scraper/render.ts` + `scraper/run.ts`

- `renderPage` already takes `timeoutMs`; lower its default from `15000` to
  `10000`.
- In `run.ts`, read configuration from the environment with fallbacks:
  - `SCRAPER_RENDER_TIMEOUT_MS` → number, default `10000`, passed into
    `renderPage`.
  - `SCRAPER_CONCURRENCY` → number, default `5`, passed as `deps.concurrency`.
    Invalid/missing values fall back to the defaults.

### 3. Tests (TDD) in `scraper/pipeline.spec.ts`

- **Concurrency limit respected:** inject a controlled `renderPage` that tracks
  in-flight calls (resolve promises manually). With many sources and
  `concurrency: 3`, assert peak concurrent renders never exceeds 3.
- **Order preserved:** with sources finishing out of order, assert `perSource`
  follows input order and aggregates (`inserted`, `failedSources`) are correct.
- Existing 8 tests remain unchanged and green.

## Error handling

Per-source isolation is unchanged: each `processSource` wraps its work in
try/catch, records an error result, and increments `failedSources`. A
`recordSourceRun` failure is caught and logged without aborting the run. One
source failing or hanging never blocks the pool beyond its own timeout.

## Out of scope

- Source URL standardization (listing vs root) — Lever/Greenhouse → #25.
- CI hardening — #18.
