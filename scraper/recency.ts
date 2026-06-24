export const RECENCY_DAYS = 60

export const recencyCutoffIso = (now: Date = new Date()): string =>
  new Date(now.getTime() - RECENCY_DAYS * 86_400_000).toISOString()

/** Keep a job when it has no date, or its date >= cutoff (lexicographic ISO compare). */
export const isRecent = (publishedAt: string | null | undefined, cutoffIso: string): boolean =>
  !publishedAt || publishedAt >= cutoffIso
