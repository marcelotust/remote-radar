import type { RelevanceLevel } from '../../types'

interface Props {
  level: RelevanceLevel
}

const LABEL: Record<RelevanceLevel, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
  negative: 'Negativa',
}

const COLOR: Record<RelevanceLevel, string> = {
  high: 'bg-brand-green/15 text-brand-green border border-brand-green/30',
  medium: 'bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30',
  low: 'bg-brand-gray/15 text-gray-400 border border-brand-gray/30',
  negative: 'bg-brand-pink/15 text-brand-pink border border-brand-pink/30',
}

export const ScoreBadge = ({ level }: Props) => (
  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${COLOR[level]}`}>
    {LABEL[level]}
  </span>
)
