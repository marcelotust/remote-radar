import { useUIContext } from '../../contexts/UIContext'
import type { StatusFilter, RelevanceFilter } from '../../types'

export const FilterBar = () => {
  const { filters, setFilters } = useUIContext()

  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-gray-900 border-b border-gray-800">
      <label className="flex items-center gap-2 text-sm text-gray-400">
        Status
        <select
          aria-label="Status"
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value as StatusFilter })}
          className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-700"
        >
          <option value="all">Todos</option>
          <option value="none">Sem status</option>
          <option value="applied">Candidatado</option>
          <option value="dismissed">Descartado</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-400">
        Relevância
        <select
          aria-label="Relevância"
          value={filters.relevance}
          onChange={(e) => setFilters({ relevance: e.target.value as RelevanceFilter })}
          className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-700"
        >
          <option value="all">Todas</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
          <option value="negative">Negativa</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-400">
        <input
          type="checkbox"
          aria-label="Wishlist only"
          checked={filters.wishlistOnly}
          onChange={(e) => setFilters({ wishlistOnly: e.target.checked })}
          className="rounded border-gray-700"
        />
        Wishlist
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-400">
        <input
          type="checkbox"
          aria-label="Não lidas"
          checked={filters.unreadOnly}
          onChange={(e) => setFilters({ unreadOnly: e.target.checked })}
          className="rounded border-gray-700"
        />
        Não lidas
      </label>
    </div>
  )
}
