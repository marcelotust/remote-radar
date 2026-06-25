import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { DEFAULT_SCORING_CONFIG } from '../utils/keywords'
import type { ScoringConfig, ScoringKeyword, ScoringSettings } from '../types'

export const SCORING_CONFIG_KEY = ['scoring-config'] as const

export const useScoringConfig = () =>
  useQuery<ScoringConfig>({
    queryKey: SCORING_CONFIG_KEY,
    queryFn: async () => {
      const [keywordsRes, settingsRes] = await Promise.all([
        supabase.from('scoring_keywords').select('*'),
        supabase.from('scoring_settings').select('*'),
      ])
      if (keywordsRes.error) throw keywordsRes.error
      if (settingsRes.error) throw settingsRes.error

      const keywords = keywordsRes.data as ScoringKeyword[]
      const settings = (settingsRes.data as ScoringSettings[])[0]

      return {
        keywords: keywords.length ? keywords : DEFAULT_SCORING_CONFIG.keywords,
        highThreshold: settings?.high_threshold ?? DEFAULT_SCORING_CONFIG.highThreshold,
        mediumThreshold: settings?.medium_threshold ?? DEFAULT_SCORING_CONFIG.mediumThreshold,
      }
    },
  })
