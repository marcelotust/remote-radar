import { useEffect, useState } from 'react'
import { useScoringConfig } from '../../hooks/useScoringConfig'
import { useReplaceScoringKeywords } from '../../hooks/useScoringConfigMutations'
import { DEFAULT_SCORING_CONFIG } from '../../utils/keywords'
import type { ScoringConfig, ScoringRule } from '../../types'

export const parseTerms = (input: string): string[] => {
  const seen = new Set<string>()
  for (const raw of input.split(',')) {
    const t = raw.trim().toLowerCase()
    if (t) seen.add(t)
  }
  return [...seen]
}

const toBuckets = (keywords: ScoringConfig['keywords']) => {
  const veto: string[] = []
  const strong: string[] = []
  const weak: string[] = []
  const negative: string[] = []
  for (const k of keywords) {
    if (k.is_veto) veto.push(k.term)
    else if (k.weight >= 2) strong.push(k.term)
    else if (k.weight <= -1) negative.push(k.term)
    else weak.push(k.term)
  }
  return {
    veto: veto.join(', '),
    strong: strong.join(', '),
    weak: weak.join(', '),
    negative: negative.join(', '),
  }
}

const textareaClass =
  'resize-none rounded-2xl border-2 border-brand-green/20 bg-brand-input px-4 py-2 text-sm text-white transition-all duration-300 focus:border-brand-green focus:bg-brand-green/5 focus:shadow-neon-input focus:outline-none'

export const KeywordBuckets = () => {
  const { data: config = DEFAULT_SCORING_CONFIG } = useScoringConfig()
  const { mutate: replace } = useReplaceScoringKeywords()

  const [veto, setVeto] = useState('')
  const [strong, setStrong] = useState('')
  const [weak, setWeak] = useState('')
  const [negative, setNegative] = useState('')

  useEffect(() => {
    const b = toBuckets(config.keywords)
    setVeto(b.veto)
    setStrong(b.strong)
    setWeak(b.weak)
    setNegative(b.negative)
  }, [config])

  const handleSave = () => {
    const used = new Set<string>()
    const rules: ScoringRule[] = []
    const add = (terms: string[], weight: number, is_veto: boolean) => {
      for (const term of terms) {
        if (used.has(term)) continue
        used.add(term)
        rules.push({ term, weight, is_veto })
      }
    }
    add(parseTerms(veto), 0, true)
    add(parseTerms(strong), 2, false)
    add(parseTerms(weak), 1, false)
    add(parseTerms(negative), -1, false)
    replace(rules)
  }

  const field = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-sm text-gray-400">
      {label}
      <textarea
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className={textareaClass}
      />
    </label>
  )

  return (
    <div className="flex flex-col gap-4">
      {field('Veto (vaga negativa)', veto, setVeto)}
      {field('Positivo forte (+2)', strong, setStrong)}
      {field('Positivo fraco (+1)', weak, setWeak)}
      {field('Negativo (−1)', negative, setNegative)}
      <button
        type="button"
        onClick={handleSave}
        className="self-start rounded-2xl bg-brand-green px-4 py-1.5 text-sm font-medium text-black transition-all duration-300 hover:shadow-neon-active"
      >
        Salvar palavras
      </button>
    </div>
  )
}
