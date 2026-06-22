export type JobStatus = 'none' | 'applied' | 'dismissed'
export type RemoteBrazilStatus = 'unknown' | 'yes' | 'no'
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
  is_wishlist_company?: boolean
  wishlist_remote_brazil?: RemoteBrazilStatus
}

export interface Company {
  id: string
  name: string
  website: string | null
  notes: string | null
  remote_brazil: RemoteBrazilStatus
  created_at: string
}

export interface ScrapingSource {
  id: string
  url: string
  label: string
  is_active: boolean
  created_at: string
}

export interface KeywordConfig {
  positive: string[]
  negative: string[]
}

export type StatusFilter = 'all' | JobStatus
export type RelevanceFilter = 'all' | RelevanceLevel

export interface FilterState {
  status: StatusFilter
  relevance: RelevanceFilter
  wishlistOnly: boolean
  unreadOnly: boolean
}
