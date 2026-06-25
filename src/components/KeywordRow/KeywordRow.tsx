import {
  useEditScoringKeyword,
  useDeleteScoringKeyword,
} from '../../hooks/useScoringConfigMutations'
import { Toggle } from '../Toggle/Toggle'
import type { ScoringKeyword } from '../../types'

interface Props {
  keyword: ScoringKeyword
}

const stepperBtn =
  'h-6 w-6 rounded-full border-2 border-brand-green/20 text-gray-300 transition-all duration-300 hover:border-brand-green'

export const KeywordRow = ({ keyword }: Props) => {
  const { mutate: editKeyword } = useEditScoringKeyword()
  const { mutate: deleteKeyword } = useDeleteScoringKeyword()

  const setWeight = (weight: number) => editKeyword({ ...keyword, weight })
  const setVeto = (is_veto: boolean) => editKeyword({ ...keyword, is_veto })

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="flex-1 truncate text-sm text-white">{keyword.term}</span>

      {!keyword.is_veto && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={`Diminuir peso de ${keyword.term}`}
            onClick={() => setWeight(keyword.weight - 1)}
            className={stepperBtn}
          >
            −
          </button>
          <span
            aria-label={`Peso de ${keyword.term}`}
            className="w-6 text-center text-sm tabular-nums text-white"
          >
            {keyword.weight}
          </span>
          <button
            type="button"
            aria-label={`Aumentar peso de ${keyword.term}`}
            onClick={() => setWeight(keyword.weight + 1)}
            className={stepperBtn}
          >
            +
          </button>
        </div>
      )}

      <Toggle id={`veto-${keyword.id}`} label="Veto" checked={keyword.is_veto} onChange={setVeto} />

      <button
        type="button"
        aria-label={`Excluir ${keyword.term}`}
        onClick={() => deleteKeyword(keyword.id)}
        className="text-xs text-brand-pink transition-all duration-300 hover:text-brand-pink/80"
      >
        Excluir
      </button>
    </div>
  )
}
