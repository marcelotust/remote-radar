export type JobStatus = 'none' | 'applied' | 'dismissed'
export type RelevanceLevel = 'high' | 'medium' | 'low' | 'negative'

export interface Job {
  id: string
  title: string
  company: string
  url: string
  location: string | null
  description: string | null
  posted_at: string | null
  scraped_at: string
  status: JobStatus
  read: boolean
  source_url: string | null
  relevance_score?: number
  relevance_level?: RelevanceLevel
  matched_keywords?: string[]
}

export interface JobUserState {
  id: string
  user_id: string
  job_id: string
  status: JobStatus
  read: boolean
  created_at: string
}

export interface ScrapingSource {
  id: string
  url: string
  label: string
  is_active: boolean
  created_at: string
  last_run_at?: string | null
  last_run_jobs_added?: number | null
  last_run_status?: 'success' | 'error' | null
  last_run_error?: string | null
}

export interface ScoringRule {
  term: string
  weight: number
  is_veto: boolean
}

export interface ScoringKeyword extends ScoringRule {
  id: string
  user_id: string | null
  created_at: string
}

export interface ScoringSettings {
  id: string
  user_id: string | null
  high_threshold: number
  medium_threshold: number
  created_at: string
}

export interface ScoringConfig {
  keywords: ScoringRule[]
  highThreshold: number
  mediumThreshold: number
}

export type StatusFilter = 'all' | JobStatus
export type RelevanceFilter = 'all' | RelevanceLevel

export interface FilterState {
  status: StatusFilter
  relevance: RelevanceFilter
  unreadOnly: boolean
}
