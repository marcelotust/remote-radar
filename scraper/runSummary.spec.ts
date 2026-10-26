import { describe, it, expect } from 'vitest'
import { buildRunSummaryMarkdown, runHealthProblem } from './runSummary.ts'
import type { ScrapeSummary } from './pipeline.ts'

const summary: ScrapeSummary = {
  sources: 2,
  extracted: 5,
  inserted: 4,
  failedSources: 1,
  perSource: [
    { url: 'https://weworkremotely.com', status: 'success', jobsAdded: 4, error: null },
    { url: 'https://arc.dev', status: 'error', jobsAdded: 0, error: 'timeout' },
  ],
}

describe('buildRunSummaryMarkdown', () => {
  it('renders the totals line', () => {
    const md = buildRunSummaryMarkdown(summary)
    expect(md).toContain('**2** sources')
    expect(md).toContain('**4** inserted')
    expect(md).toContain('**1** failed')
  })

  it('renders one table row per source including errors', () => {
    const md = buildRunSummaryMarkdown(summary)
    expect(md).toContain('| https://weworkremotely.com | success | 4 |')
    expect(md).toContain('| https://arc.dev | error | 0 |')
  })
})

describe('runHealthProblem', () => {
  it('accepts a run that extracted jobs with a minority of failed sources', () => {
    expect(runHealthProblem(summary)).toBeNull()
  })

  it('flags a run that extracted nothing', () => {
    expect(runHealthProblem({ ...summary, extracted: 0, inserted: 0 })).toBe(
      'no jobs extracted from any source'
    )
  })

  it('flags a run where most sources failed', () => {
    expect(runHealthProblem({ ...summary, sources: 5, failedSources: 3 })).toBe(
      '3 of 5 sources failed'
    )
  })

  it('flags a run with no active sources', () => {
    expect(runHealthProblem({ ...summary, sources: 0, perSource: [] })).toBe('no active sources')
  })
})
