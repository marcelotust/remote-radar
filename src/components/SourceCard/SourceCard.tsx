import { useDeleteSource, useEditSource } from '../../hooks/useSourceMutations'
import { useUIContext } from '../../contexts/UIContext'
import type { ScrapingSource } from '../../types'
import { formatLastRun } from './formatLastRun'

interface Props {
  source: ScrapingSource
}

export const SourceCard = ({ source }: Props) => {
  const { mutate: deleteSource } = useDeleteSource()
  const { mutate: editSource } = useEditSource()
  const { setEditingSource, setSourceModalOpen } = useUIContext()

  const lastRun = formatLastRun(source)
  const lastRunClass =
    lastRun.tone === 'error'
      ? 'text-amber-400'
      : lastRun.tone === 'ok'
        ? 'text-gray-400'
        : 'text-gray-600'

  const handleEdit = () => {
    setEditingSource(source)
    setSourceModalOpen(true)
  }

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

      <p className={`text-xs ${lastRunClass}`} title={lastRun.title}>
        {lastRun.text}
      </p>

      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={handleEdit}
          aria-label="Editar"
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Editar
        </button>
        <button
          onClick={() => deleteSource(source.id)}
          aria-label="Excluir"
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Excluir
        </button>
      </div>
    </article>
  )
}
