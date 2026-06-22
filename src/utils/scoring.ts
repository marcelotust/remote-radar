import type { Job, KeywordConfig, RelevanceLevel } from '../types'

const matchesKeyword = (text: string, keyword: string): boolean => {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Boundaries via lookarounds (not \b, which breaks on '.', '#', '-').
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(text)
}

export const computeRelevanceScore = (
  job: Pick<Job, 'title' | 'description'>,
  config: KeywordConfig
): { score: number; level: RelevanceLevel } => {
  const text = `${job.title} ${job.description ?? ''}`.toLowerCase()

  const positiveMatches = config.positive.filter((kw) => matchesKeyword(text, kw))
  const negativeMatches = config.negative.filter((kw) => matchesKeyword(text, kw))

  const score = positiveMatches.length - negativeMatches.length

  const level: RelevanceLevel =
    score >= 3 ? 'high' : score >= 1 ? 'medium' : score === 0 ? 'low' : 'negative'

  return { score, level }
}
