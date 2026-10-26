import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface SourceRow {
  url: string
  label: string
}

export interface JobRow {
  title: string
  company: string
  url: string
  location: string | null
  description: string | null
  source_url: string
  /** The source's own publication date (ISO), or null when it exposes none. */
  posted_at: string | null
  relevance_score: number
  relevance_level: string
}

export type SourceRunStatus = 'success' | 'error'

export interface SourceRunResult {
  url: string
  status: SourceRunStatus
  jobsAdded: number
  error: string | null
}

type DbClient = Pick<SupabaseClient, 'from'>

export const createScraperClient = (): SupabaseClient => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export const fetchActiveSources = async (client: DbClient): Promise<SourceRow[]> => {
  const { data, error } = await client
    .from('scraping_sources')
    .select('url,label')
    .eq('is_active', true)
  if (error) throw error
  return (data ?? []) as SourceRow[]
}

// Keeps each `url=in.(...)` query string well under proxy length limits.
const URL_CHUNK_SIZE = 40

const existingUrls = async (client: DbClient, urls: string[]): Promise<Set<string>> => {
  const found = new Set<string>()
  for (let i = 0; i < urls.length; i += URL_CHUNK_SIZE) {
    const { data, error } = await client
      .from('jobs')
      .select('url')
      .in('url', urls.slice(i, i + URL_CHUNK_SIZE))
    if (error) throw error
    for (const row of (data ?? []) as { url: string }[]) found.add(row.url)
  }
  return found
}

/**
 * Inserts new jobs and refreshes the ones the source still lists: every row is
 * stamped `last_seen_at` (how the feed tells a closed job from an open one),
 * and an existing row also takes the latest posted_at and content. Returns how
 * many jobs were new, not how many were touched.
 */
export const upsertJobs = async (client: DbClient, jobs: JobRow[]): Promise<{ count: number }> => {
  // One row per url: Postgres rejects an upsert that hits the same row twice.
  const unique = [...new Map(jobs.map((j) => [j.url, j])).values()]
  if (unique.length === 0) return { count: 0 }
  const known = await existingUrls(
    client,
    unique.map((j) => j.url)
  )
  const seenAt = new Date().toISOString()
  const { error } = await client.from('jobs').upsert(
    unique.map((j) => ({ ...j, last_seen_at: seenAt })),
    { onConflict: 'url' }
  )
  if (error) throw error
  return { count: unique.filter((j) => !known.has(j.url)).length }
}

export const recordSourceRun = async (client: DbClient, result: SourceRunResult): Promise<void> => {
  const { error } = await client
    .from('scraping_sources')
    .update({
      last_run_at: new Date().toISOString(),
      last_run_jobs_added: result.jobsAdded,
      last_run_status: result.status,
      last_run_error: result.error,
    })
    .eq('url', result.url)
  if (error) throw error
}
