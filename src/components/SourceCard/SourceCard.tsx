import { useDeleteSource, useEditSource } from '../../hooks/useSourceMutations'
import type { ScrapingSource } from '../../types'

interface Props {
  source: ScrapingSource
}

export const SourceCard = ({ source }: Props) => {
  const { mutate: deleteSource } = useDeleteSource()
  const { mutate: editSource } = useEditSource()

  return (
    <article className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-white font-semibold text-sm">{source.label}</span>
        <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={source.is_active}
            onChange={(e) => editSource({ ...source, is_active: e.target.checked })}
            className="rounded border-gray-700"
          />
          Ativo
        </label>
      </div>

      <p className="text-gray-500 text-xs truncate">{source.url}</p>

      <button
        onClick={() => deleteSource(source.id)}
        aria-label="Excluir"
        className="self-start text-xs text-red-400 hover:text-red-300 transition-colors mt-1"
      >
        Excluir
      </button>
    </article>
  )
}
