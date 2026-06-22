import { describe, it, expect } from 'vitest'
import { computeRelevanceScore } from './scoring'
import type { KeywordConfig } from '../types'

const config: KeywordConfig = {
  positive: ['react', 'typescript', 'remote'],
  negative: ['php', 'presencial'],
}

describe('computeRelevanceScore', () => {
  it('returns high level when 3+ positive matches', () => {
    const job = { title: 'React Typescript Remote Dev', description: null }
    const { score, level } = computeRelevanceScore(job, config)
    expect(score).toBe(3)
    expect(level).toBe('high')
  })

  it('returns medium level when 1-2 positive matches', () => {
    const job = { title: 'React Developer', description: null }
    const { score, level } = computeRelevanceScore(job, config)
    expect(score).toBe(1)
    expect(level).toBe('medium')
  })

  it('returns low level when score is 0', () => {
    const job = { title: 'Backend Developer', description: null }
    const { score, level } = computeRelevanceScore(job, config)
    expect(score).toBe(0)
    expect(level).toBe('low')
  })

  it('returns negative level when negative keywords outweigh positive', () => {
    const job = { title: 'PHP Developer presencial', description: null }
    const { score, level } = computeRelevanceScore(job, config)
    expect(score).toBe(-2)
    expect(level).toBe('negative')
  })

  it('counts keywords from description as well as title', () => {
    const job = { title: 'Developer', description: 'Must know react and typescript' }
    const { score, level } = computeRelevanceScore(job, config)
    expect(score).toBe(2)
    expect(level).toBe('medium')
  })

  it('handles null description gracefully', () => {
    const job = { title: 'Developer', description: null }
    expect(() => computeRelevanceScore(job, config)).not.toThrow()
  })
})

describe('computeRelevanceScore word boundaries', () => {
  const boundaryConfig: KeywordConfig = {
    positive: ['react', 'c#', '.net'],
    negative: ['java'],
  }

  it('does not match a keyword inside a larger word', () => {
    const job = { title: 'Senior JavaScript Engineer', description: null }
    // "java" must NOT match inside "javascript"
    const { score } = computeRelevanceScore(job, boundaryConfig)
    expect(score).toBe(0)
  })

  it('still matches standalone keywords next to punctuation', () => {
    const job = { title: 'React, C# and .NET developer', description: null }
    const { score } = computeRelevanceScore(job, boundaryConfig)
    expect(score).toBe(3)
  })

  it('matches a whole-word negative keyword', () => {
    const job = { title: 'Java Backend Engineer', description: null }
    const { score } = computeRelevanceScore(job, boundaryConfig)
    expect(score).toBe(-1)
  })
})
