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
