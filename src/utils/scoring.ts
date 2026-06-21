import type { Job, KeywordConfig, RelevanceLevel } from '../types'

export const computeRelevanceScore = (
  job: Pick<Job, 'title' | 'description'>,
  config: KeywordConfig
): { score: number; level: RelevanceLevel } => {
  const text = `${job.title} ${job.description ?? ''}`.toLowerCase()

  const positiveMatches = config.positive.filter((kw) => text.includes(kw.toLowerCase()))
  const negativeMatches = config.negative.filter((kw) => text.includes(kw.toLowerCase()))

  const score = positiveMatches.length - negativeMatches.length

  const level: RelevanceLevel =
    score >= 3 ? 'high' : score >= 1 ? 'medium' : score === 0 ? 'low' : 'negative'

  return { score, level }
}
