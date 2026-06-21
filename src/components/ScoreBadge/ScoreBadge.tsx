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
  high: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-gray-500/20 text-gray-400',
  negative: 'bg-red-500/20 text-red-400',
}

export const ScoreBadge = ({ level }: Props) => (
  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${COLOR[level]}`}>
    {LABEL[level]}
  </span>
)
