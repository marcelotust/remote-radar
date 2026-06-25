import { useState } from 'react'
import { useScoringConfig } from '../../hooks/useScoringConfig'
import { computeRelevanceScore } from '../../utils/scoring'
import { DEFAULT_SCORING_CONFIG } from '../../utils/keywords'
import { ScoreBadge } from '../ScoreBadge/ScoreBadge'

export const ScorePreview = () => {
  const { data: config = DEFAULT_SCORING_CONFIG } = useScoringConfig()
  const [text, setText] = useState('')
  const { score, level } = computeRelevanceScore({ title: text, description: null }, config)

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="score-preview" className="text-sm text-gray-400">
        Testar vaga
      </label>
      <textarea
        id="score-preview"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Cole o título/descrição de uma vaga"
        className="resize-none rounded-2xl border-2 border-brand-green/20 bg-brand-input px-4 py-2 text-sm text-white transition-all duration-300 focus:border-brand-green focus:bg-brand-green/5 focus:shadow-neon-input focus:outline-none"
      />
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span>
          Score: <span className="font-semibold text-white">{score}</span>
        </span>
        <ScoreBadge level={level} />
      </div>
    </div>
  )
}
