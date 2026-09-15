import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_SCORING_CONFIG } from '../utils/keywords'
import type { ScoringConfig, ScoringKeyword, ScoringSettings } from '../types'

export const SCORING_CONFIG_KEY = ['scoring-config'] as const

export const useScoringConfig = () => {
  const { user } = useAuth()

  return useQuery<ScoringConfig>({
    queryKey: SCORING_CONFIG_KEY,
    queryFn: async () => {
      const userId = user!.id
      const [keywordsRes, settingsRes] = await Promise.all([
        supabase.from('scoring_keywords').select('*'),
        supabase.from('scoring_settings').select('*'),
      ])
      if (keywordsRes.error) throw keywordsRes.error
      if (settingsRes.error) throw settingsRes.error

      // RLS (see #75) only ever returns the caller's own rows plus the
      // global (user_id null) defaults — never another user's config. A
      // user's own rows, once they have any, take priority over the global
      // fallback.
      const keywordRows = keywordsRes.data as ScoringKeyword[]
      const ownKeywords = keywordRows.filter((k) => k.user_id === userId)
      const globalKeywords = keywordRows.filter((k) => k.user_id === null)
      const keywords = ownKeywords.length
        ? ownKeywords
        : globalKeywords.length
          ? globalKeywords
          : DEFAULT_SCORING_CONFIG.keywords

      const settingsRows = settingsRes.data as ScoringSettings[]
      const settings =
        settingsRows.find((s) => s.user_id === userId) ??
        settingsRows.find((s) => s.user_id === null)

      return {
        keywords,
        highThreshold: settings?.high_threshold ?? DEFAULT_SCORING_CONFIG.highThreshold,
        mediumThreshold: settings?.medium_threshold ?? DEFAULT_SCORING_CONFIG.mediumThreshold,
      }
    },
    enabled: !!user,
  })
}
