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

export const upsertJobs = async (client: DbClient, jobs: JobRow[]): Promise<{ count: number }> => {
  if (jobs.length === 0) return { count: 0 }
  const { data, error } = await client
    .from('jobs')
    .upsert(jobs, { onConflict: 'url', ignoreDuplicates: true })
    .select('url')
  if (error) throw error
  return { count: data?.length ?? 0 }
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
