import type { ScrapeSummary } from './pipeline.ts'

export const buildRunSummaryMarkdown = (summary: ScrapeSummary): string => {
  const lines: string[] = [
    '## Scraper run',
    '',
    `**${summary.sources}** sources · **${summary.extracted}** extracted · ` +
      `**${summary.inserted}** inserted · **${summary.failedSources}** failed`,
    '',
    '| Source | Status | Jobs added |',
    '| --- | --- | --- |',
  ]
  for (const r of summary.perSource) {
    lines.push(`| ${r.url} | ${r.status} | ${r.jobsAdded} |`)
  }
  return lines.join('\n') + '\n'
}

/**
 * Why a run should fail the workflow, or null when it looks healthy. A run that
 * "succeeds" while extracting nothing, or while most sources error, is a broken
 * scraper in disguise; failing the Action gets the repo owner an email instead
 * of the feed going quiet unnoticed.
 */
export const runHealthProblem = (summary: ScrapeSummary): string | null => {
  if (summary.sources === 0) return 'no active sources'
  if (summary.extracted === 0) return 'no jobs extracted from any source'
  if (summary.failedSources > summary.sources / 2) {
    return `${summary.failedSources} of ${summary.sources} sources failed`
  }
  return null
}
