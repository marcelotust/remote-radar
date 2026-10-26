import type { Job, FilterState } from '../types'
import { isNewJob } from '../utils/jobDates'

export const applyFilters = (jobs: Job[], filters: FilterState): Job[] =>
  jobs.filter((job) => {
    if (filters.status === 'all') {
      if (job.status === 'dismissed') return false
    } else if (job.status !== filters.status) {
      return false
    }
    if (filters.relevance !== 'all' && job.relevance_level !== filters.relevance) return false
    if (filters.unreadOnly && job.read) return false
    if (filters.newOnly && !isNewJob(job)) return false
    return true
  })
