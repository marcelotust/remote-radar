import { useDeleteSource, useEditSource } from '../../hooks/useSourceMutations'
import { useUIContext } from '../../contexts/UIContext'
import { useAuth } from '../../contexts/AuthContext'
import { Toggle } from '../Toggle/Toggle'
import type { ScrapingSource } from '../../types'
import { formatLastRun } from './formatLastRun'

interface Props {
  source: ScrapingSource
}

export const SourceCard = ({ source }: Props) => {
  const { mutate: deleteSource } = useDeleteSource()
  const { mutate: editSource } = useEditSource()
  const { setEditingSource, setSourceModalOpen } = useUIContext()
  const { user } = useAuth()
  const isOwner = !source.created_by || source.created_by === user?.id

  const lastRun = formatLastRun(source)
  const lastRunClass =
    lastRun.tone === 'error'
      ? 'text-brand-yellow'
      : lastRun.tone === 'ok'
        ? 'text-gray-400'
        : 'text-gray-600'

  const handleEdit = () => {
    setEditingSource(source)
    setSourceModalOpen(true)
  }

  return (
    <article className="bg-brand-surface border-2 border-brand-green/20 rounded-3xl p-5 flex flex-col gap-2 transition-all duration-300 hover:border-brand-green/60 hover:shadow-neon-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-white font-semibold text-sm">{source.label}</span>
        <Toggle
          id={`source-active-${source.id}`}
          label="Ativo"
          checked={source.is_active}
          onChange={(checked) => editSource({ ...source, is_active: checked })}
        />
      </div>

      <p className="text-gray-500 text-xs truncate">{source.url}</p>

      <p className={`text-xs ${lastRunClass}`} title={lastRun.title}>
        {lastRun.text}
      </p>

      {source.created_by_email && (
        <p className="text-gray-600 text-xs">adicionado por {source.created_by_email}</p>
      )}

      {isOwner && (
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={handleEdit}
            aria-label="Editar"
            className="text-xs text-gray-400 hover:text-brand-green transition-all duration-300"
          >
            Editar
          </button>
          <button
            onClick={() => deleteSource(source.id)}
            aria-label="Excluir"
            className="text-xs text-brand-pink hover:text-brand-pink/80 transition-all duration-300"
          >
            Excluir
          </button>
        </div>
      )}
    </article>
  )
}
