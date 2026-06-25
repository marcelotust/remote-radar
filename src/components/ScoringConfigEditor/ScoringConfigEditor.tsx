import { useState } from 'react'
import { useScoringConfig } from '../../hooks/useScoringConfig'
import { DEFAULT_SCORING_CONFIG } from '../../utils/keywords'
import { ThresholdsForm } from '../ThresholdsForm/ThresholdsForm'
import { KeywordList } from '../KeywordList/KeywordList'
import { AddKeywordModal } from '../AddKeywordModal/AddKeywordModal'
import { ScorePreview } from '../ScorePreview/ScorePreview'
import type { ScoringKeyword } from '../../types'

export const ScoringConfigEditor = () => {
  const { data: config = DEFAULT_SCORING_CONFIG } = useScoringConfig()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <ThresholdsForm
        highThreshold={config.highThreshold}
        mediumThreshold={config.mediumThreshold}
      />
      <KeywordList
        keywords={config.keywords as ScoringKeyword[]}
        onAdd={() => setModalOpen(true)}
      />
      <ScorePreview />
      <AddKeywordModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
