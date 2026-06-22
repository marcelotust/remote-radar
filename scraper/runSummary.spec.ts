import { describe, it, expect } from 'vitest'
import { buildRunSummaryMarkdown } from './runSummary.ts'
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
