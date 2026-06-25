import { KeywordRow } from '../KeywordRow/KeywordRow'
import type { ScoringKeyword } from '../../types'

interface Props {
  keywords: ScoringKeyword[]
  onAdd: () => void
}

const byTerm = (a: ScoringKeyword, b: ScoringKeyword) => a.term.localeCompare(b.term)

export const KeywordList = ({ keywords, onAdd }: Props) => {
  const vetoes = keywords.filter((k) => k.is_veto).sort(byTerm)
  const scored = keywords
    .filter((k) => !k.is_veto)
    .sort((a, b) => b.weight - a.weight || byTerm(a, b))

  return (
    <div className="flex flex-col gap-4">
      {vetoes.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">Vetos</h3>
          {vetoes.map((k) => (
            <KeywordRow key={k.id} keyword={k} />
          ))}
        </section>
      )}
      {scored.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">Pontuação</h3>
          {scored.map((k) => (
            <KeywordRow key={k.id} keyword={k} />
          ))}
        </section>
      )}
      <button
        type="button"
        onClick={onAdd}
        className="self-start rounded-2xl bg-brand-green px-4 py-1.5 text-sm font-medium text-black transition-all duration-300 hover:shadow-neon-active"
      >
        + Adicionar palavra
      </button>
    </div>
  )
}
