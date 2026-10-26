import type { Job } from '../types'

/** A job counts as "new" for this many days after it was published. */
export const NEW_JOB_DAYS = 7

const MS_PER_DAY = 86_400_000

/**
 * The date a job is ranked and windowed by: its publication date when the
 * source gave one, else the day it was first scraped (mirrors the `listed_at`
 * column, which the fake and older rows may lack).
 */
export const listedAt = (job: Pick<Job, 'listed_at' | 'posted_at' | 'scraped_at'>): string =>
  job.listed_at ?? job.posted_at ?? job.scraped_at

export const isNewJob = (
  job: Pick<Job, 'listed_at' | 'posted_at' | 'scraped_at'>,
  now: number = Date.now()
): boolean => {
  const listed = Date.parse(listedAt(job))
  return !Number.isNaN(listed) && now - listed <= NEW_JOB_DAYS * MS_PER_DAY
}
