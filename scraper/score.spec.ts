import { describe, it, expect } from 'vitest'
import { scoreJob } from './score.ts'

describe('scoreJob', () => {
  it('scores using the shared keyword config', () => {
    const result = scoreJob({
      title: 'Remote React TypeScript Engineer',
      company: 'Acme',
      url: 'https://x/1',
      location: 'Remote',
      description: 'Next.js and Tailwind',
      published_at: null,
    })
    expect(result.relevance_score).toBeGreaterThanOrEqual(3)
    expect(result.relevance_level).toBe('high')
  })

  it('does not match java inside javascript (shared boundary rule)', () => {
    const result = scoreJob({
      title: 'JavaScript Developer',
      company: 'Acme',
      url: 'https://x/2',
      location: null,
      description: null,
      published_at: null,
    })
    // 'java' must NOT match inside 'javascript'; 'javascript' keyword itself scores +1
    expect(result.relevance_score).toBe(1)
    expect(result.relevance_level).toBe('medium')
  })
})
