import { computeRelevanceScore } from '../src/utils/scoring.ts'
import { KEYWORD_CONFIG } from '../src/utils/keywords.ts'
import type { RelevanceLevel } from '../src/types/index.ts'
import type { RawJob } from './adapters/types.ts'

export const scoreJob = (
  raw: RawJob
): { relevance_score: number; relevance_level: RelevanceLevel } => {
  const { score, level } = computeRelevanceScore(
    { title: raw.title, description: raw.description },
    KEYWORD_CONFIG
  )
  return { relevance_score: score, relevance_level: level }
}
