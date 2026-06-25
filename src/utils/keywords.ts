import type { ScoringConfig } from '../types'

// Default scoring config used as a fallback until Supabase has rows. Mirrors the
// seed in supabase/schema.sql. Weights: strong = 2, weak = 1, veto weight = 0.
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  keywords: [
    // Vetoes — any match forces the job to 'negative'.
    { term: 'presencial', weight: 0, is_veto: true },
    { term: 'híbrido', weight: 0, is_veto: true },
    { term: 'hybrid', weight: 0, is_veto: true },
    { term: 'on-site', weight: 0, is_veto: true },
    { term: 'onsite', weight: 0, is_veto: true },
    { term: 'java', weight: 0, is_veto: true },
    { term: 'php', weight: 0, is_veto: true },
    { term: 'cobol', weight: 0, is_veto: true },
    { term: '.net', weight: 0, is_veto: true },
    { term: 'c#', weight: 0, is_veto: true },
    { term: 'golang', weight: 0, is_veto: true },
    // Strong positive (+2).
    { term: 'react', weight: 2, is_veto: false },
    { term: 'remote', weight: 2, is_veto: false },
    { term: 'worldwide remote', weight: 2, is_veto: false },
    { term: 'remote worldwide', weight: 2, is_veto: false },
    { term: '100% remote', weight: 2, is_veto: false },
    { term: 'frontend', weight: 2, is_veto: false },
    { term: 'front-end', weight: 2, is_veto: false },
    { term: 'typescript', weight: 2, is_veto: false },
    // Weak positive (+1).
    { term: 'reactjs', weight: 1, is_veto: false },
    { term: 'next.js', weight: 1, is_veto: false },
    { term: 'nextjs', weight: 1, is_veto: false },
    { term: 'tailwind', weight: 1, is_veto: false },
    { term: 'node', weight: 1, is_veto: false },
    { term: 'rails', weight: 1, is_veto: false },
    { term: 'css', weight: 1, is_veto: false },
    { term: 'javascript', weight: 1, is_veto: false },
    { term: 'js', weight: 1, is_veto: false },
    { term: 'figma', weight: 1, is_veto: false },
    { term: 'ux', weight: 1, is_veto: false },
    { term: 'ui', weight: 1, is_veto: false },
    { term: 'hotwire', weight: 1, is_veto: false },
    { term: 'worldwide', weight: 1, is_veto: false },
  ],
  highThreshold: 4,
  mediumThreshold: 1,
}

export const parseTerms = (input: string): string[] => {
  const seen = new Set<string>()
  for (const raw of input.split(',')) {
    const t = raw.trim().toLowerCase()
    if (t) seen.add(t)
  }
  return [...seen]
}
