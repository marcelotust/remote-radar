import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_SCORING_CONFIG } from '../utils/keywords'
import { SCORING_CONFIG_KEY } from './useScoringConfig'
import type { ScoringConfig, ScoringKeyword, ScoringRule } from '../types'

type NewKeyword = Pick<ScoringKeyword, 'term' | 'weight' | 'is_veto'>

// useAddScoringKeyword/useEditScoringKeyword/useDeleteScoringKeyword aren't
// wired into any page (the Settings UI only uses useReplaceScoringKeywords),
// kept for single-keyword edits if that UI ever lands. Only the user_id this
// hook stamps on insert changed for #75; edit/delete already operate by row
// id and are subject to the same per-user RLS as everything else.
export const useAddScoringKeyword = () => {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (data: NewKeyword): Promise<ScoringKeyword> => {
      const { data: inserted, error } = await supabase
        .from('scoring_keywords')
        .insert({ ...data, user_id: user?.id ?? null })
        .select()
        .single()
      if (error) throw error
      return inserted as ScoringKeyword
    },
    onSuccess: (keyword) => {
      qc.setQueryData<ScoringConfig>(SCORING_CONFIG_KEY, (old) => {
        const base = old ?? DEFAULT_SCORING_CONFIG
        return { ...base, keywords: [...base.keywords, keyword] }
      })
    },
  })
}

export const useEditScoringKeyword = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (keyword: ScoringKeyword): Promise<ScoringKeyword> => {
      const patch = {
        term: keyword.term,
        weight: keyword.weight,
        is_veto: keyword.is_veto,
      }
      const { data: updated, error } = await supabase
        .from('scoring_keywords')
        .update(patch)
        .eq('id', keyword.id)
        .select()
        .single()
      if (error) throw error
      return updated as ScoringKeyword
    },
    onSuccess: (updated) => {
      qc.setQueryData<ScoringConfig>(SCORING_CONFIG_KEY, (old) => {
        const base = old ?? DEFAULT_SCORING_CONFIG
        return {
          ...base,
          keywords: base.keywords.map((k) =>
            'id' in k && (k as ScoringKeyword).id === updated.id ? updated : k
          ),
        }
      })
    },
  })
}

export const useDeleteScoringKeyword = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('scoring_keywords').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, id) => {
      qc.setQueryData<ScoringConfig>(SCORING_CONFIG_KEY, (old) => {
        const base = old ?? DEFAULT_SCORING_CONFIG
        return {
          ...base,
          keywords: base.keywords.filter((k) => !('id' in k) || (k as ScoringKeyword).id !== id),
        }
      })
    },
  })
}

type SettingsPatch = { high_threshold: number; medium_threshold: number }

// Upserts (not update) because a user may not have a personal settings row
// yet — the first save creates one from the global defaults they were
// looking at, from then on it's theirs alone.
export const useUpdateScoringSettings = () => {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (patch: SettingsPatch): Promise<SettingsPatch> => {
      const { error } = await supabase
        .from('scoring_settings')
        .upsert({ user_id: user!.id, ...patch }, { onConflict: 'user_id' })
      if (error) throw error
      return patch
    },
    onSuccess: (patch) => {
      qc.setQueryData<ScoringConfig>(SCORING_CONFIG_KEY, (old) => ({
        ...(old ?? DEFAULT_SCORING_CONFIG),
        highThreshold: patch.high_threshold,
        mediumThreshold: patch.medium_threshold,
      }))
    },
  })
}

// Replaces only the current user's own keywords, never the global defaults —
// the first save this way is what "forks" a personal config off the global
// one (useScoringConfig then has own rows to prefer).
export const useReplaceScoringKeywords = () => {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (rules: ScoringRule[]): Promise<void> => {
      const userId = user!.id
      const { error: delError } = await supabase
        .from('scoring_keywords')
        .delete()
        .eq('user_id', userId)
      if (delError) throw delError
      if (rules.length > 0) {
        const { error: insError } = await supabase
          .from('scoring_keywords')
          .insert(rules.map((r) => ({ ...r, user_id: userId })))
        if (insError) throw insError
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCORING_CONFIG_KEY })
    },
  })
}
