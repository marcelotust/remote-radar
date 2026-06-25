import { describe, it, expect } from 'vitest'
import { computeRelevanceScore } from './scoring'
import type { ScoringConfig } from '../types'

const config: ScoringConfig = {
  keywords: [
    { term: 'react', weight: 2, is_veto: false },
    { term: 'typescript', weight: 2, is_veto: false },
    { term: 'node', weight: 1, is_veto: false },
    { term: 'worldwide remote', weight: 2, is_veto: false },
    { term: 'java', weight: 0, is_veto: true },
    { term: 'presencial', weight: 0, is_veto: true },
    { term: 'legacy', weight: -1, is_veto: false },
  ],
  highThreshold: 4,
  mediumThreshold: 1,
}

describe('computeRelevanceScore', () => {
  it('sums weights and returns high at/above the high threshold', () => {
    const job = { title: 'React TypeScript Engineer', description: null }
    expect(computeRelevanceScore(job, config)).toEqual({ score: 4, level: 'high' })
  })

  it('returns medium between medium and high thresholds', () => {
    const job = { title: 'Node Developer', description: null }
    expect(computeRelevanceScore(job, config)).toEqual({ score: 1, level: 'medium' })
  })

  it('returns low when score is 0', () => {
    const job = { title: 'Backend Developer', description: null }
    expect(computeRelevanceScore(job, config)).toEqual({ score: 0, level: 'low' })
  })

  it('forces negative when a veto keyword matches, ignoring positive points', () => {
    const job = { title: 'React TypeScript presencial', description: null }
    const { level } = computeRelevanceScore(job, config)
    expect(level).toBe('negative')
  })

  it('returns negative when negative-weight keywords push the score below 0', () => {
    const job = { title: 'Legacy maintainer', description: null }
    expect(computeRelevanceScore(job, config)).toEqual({ score: -1, level: 'negative' })
  })

  it('matches multi-word phrases', () => {
    const job = { title: 'Worldwide Remote React role', description: null }
    expect(computeRelevanceScore(job, config)).toEqual({ score: 4, level: 'high' })
  })

  it('reads keywords from the description too', () => {
    const job = { title: 'Developer', description: 'Strong react and node skills' }
    expect(computeRelevanceScore(job, config)).toEqual({ score: 3, level: 'medium' })
  })

  it('handles a null description gracefully', () => {
    const job = { title: 'Developer', description: null }
    expect(() => computeRelevanceScore(job, config)).not.toThrow()
  })
})
