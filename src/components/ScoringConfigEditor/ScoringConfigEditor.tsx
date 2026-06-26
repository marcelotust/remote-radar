import { useScoringConfig } from '../../hooks/useScoringConfig'
import { DEFAULT_SCORING_CONFIG } from '../../utils/keywords'
import { ThresholdsForm } from '../ThresholdsForm/ThresholdsForm'
import { KeywordBuckets } from '../KeywordBuckets/KeywordBuckets'
import { ScorePreview } from '../ScorePreview/ScorePreview'

export const ScoringConfigEditor = () => {
  const { data: config = DEFAULT_SCORING_CONFIG } = useScoringConfig()

  return (
    <div className="flex flex-col gap-6">
      <ThresholdsForm
        highThreshold={config.highThreshold}
        mediumThreshold={config.mediumThreshold}
      />
      <KeywordBuckets />
      <ScorePreview />
    </div>
  )
}
