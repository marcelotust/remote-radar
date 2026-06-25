import { useUpdateScoringSettings } from '../../hooks/useScoringConfigMutations'

interface Props {
  highThreshold: number
  mediumThreshold: number
}

const numberInput =
  'w-16 rounded-2xl border-2 border-brand-green/20 bg-brand-input px-3 py-1.5 text-sm text-white transition-all duration-300 focus:border-brand-green focus:outline-none'

export const ThresholdsForm = ({ highThreshold, mediumThreshold }: Props) => {
  const { mutate: updateSettings } = useUpdateScoringSettings()

  const apply = (high: number, medium: number) =>
    updateSettings({ high_threshold: high, medium_threshold: medium })

  const setHigh = (high: number) => apply(high, Math.min(mediumThreshold, high))
  const setMedium = (medium: number) => apply(Math.max(highThreshold, medium), medium)

  return (
    <div className="flex flex-wrap gap-6">
      <label className="flex items-center gap-2 text-sm text-gray-400">
        Alta ≥
        <input
          type="number"
          aria-label="Limiar alta"
          value={highThreshold}
          onChange={(e) => setHigh(Number(e.target.value))}
          className={numberInput}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-400">
        Média ≥
        <input
          type="number"
          aria-label="Limiar média"
          value={mediumThreshold}
          onChange={(e) => setMedium(Number(e.target.value))}
          className={numberInput}
        />
      </label>
    </div>
  )
}
