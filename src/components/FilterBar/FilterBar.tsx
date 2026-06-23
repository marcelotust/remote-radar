import { useUIContext } from '../../contexts/UIContext'
import { Toggle } from '../Toggle/Toggle'
import type { StatusFilter, RelevanceFilter } from '../../types'

const selectClass =
  'bg-brand-input text-gray-300 text-xs rounded-2xl px-3 py-1.5 border-2 border-brand-green/20 transition-all duration-300 focus:outline-none focus:border-brand-green focus:bg-brand-green/5 focus:shadow-neon-input'

export const FilterBar = () => {
  const { filters, setFilters } = useUIContext()

  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-brand-bg border-b border-brand-gray/20">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <label htmlFor="status-filter">Status</label>
        <select
          id="status-filter"
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value as StatusFilter })}
          className={selectClass}
        >
          <option value="all">Todos</option>
          <option value="none">Sem status</option>
          <option value="applied">Candidatado</option>
          <option value="dismissed">Descartado</option>
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-400">
        <label htmlFor="relevance-filter">Relevância</label>
        <select
          id="relevance-filter"
          value={filters.relevance}
          onChange={(e) => setFilters({ relevance: e.target.value as RelevanceFilter })}
          className={selectClass}
        >
          <option value="all">Todas</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
          <option value="negative">Negativa</option>
        </select>
      </div>

      <Toggle
        id="wishlist-filter"
        label="Wishlist"
        checked={filters.wishlistOnly}
        onChange={(checked) => setFilters({ wishlistOnly: checked })}
      />

      <Toggle
        id="unread-filter"
        label="Não lidas"
        checked={filters.unreadOnly}
        onChange={(checked) => setFilters({ unreadOnly: checked })}
      />
    </div>
  )
}
