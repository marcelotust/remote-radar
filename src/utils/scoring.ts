import type { Job, ScoringConfig, RelevanceLevel } from '../types'

const matchesKeyword = (text: string, keyword: string): boolean => {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Boundaries via lookarounds (not \b, which breaks on '.', '#', '-').
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(text)
}

export const computeRelevanceScore = (
  job: Pick<Job, 'title' | 'description'>,
  config: ScoringConfig
): { score: number; level: RelevanceLevel } => {
  const text = `${job.title} ${job.description ?? ''}`.toLowerCase()

  const matched = config.keywords.filter((k) => matchesKeyword(text, k.term))
  const hasVeto = matched.some((k) => k.is_veto)
  const score = matched.filter((k) => !k.is_veto).reduce((sum, k) => sum + k.weight, 0)

  const level: RelevanceLevel = hasVeto
    ? 'negative'
    : score >= config.highThreshold
      ? 'high'
      : score >= config.mediumThreshold
        ? 'medium'
        : score >= 0
          ? 'low'
          : 'negative'

  return { score, level }
}
