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
