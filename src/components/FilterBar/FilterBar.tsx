import { useUIContext } from '../../contexts/UIContext'
import { Toggle } from '../Toggle/Toggle'
import { Select } from '../Select/Select'
import type { StatusFilter, RelevanceFilter } from '../../types'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'none', label: 'Sem status' },
  { value: 'applied', label: 'Candidatado' },
  { value: 'dismissed', label: 'Descartado' },
]

const RELEVANCE_OPTIONS: { value: RelevanceFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
  { value: 'negative', label: 'Negativa' },
]

export const FilterBar = () => {
  const { filters, setFilters } = useUIContext()

  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-3 bg-brand-bg border-b border-brand-gray/20">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <label htmlFor="status-filter">Status</label>
        <Select
          id="status-filter"
          ariaLabel="Status"
          value={filters.status}
          onChange={(status) => setFilters({ status })}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-400">
        <label htmlFor="relevance-filter">Relevância</label>
        <Select
          id="relevance-filter"
          ariaLabel="Relevância"
          value={filters.relevance}
          onChange={(relevance) => setFilters({ relevance })}
          options={RELEVANCE_OPTIONS}
        />
      </div>

      <Toggle
        id="unread-filter"
        label="Não lidas"
        checked={filters.unreadOnly}
        onChange={(checked) => setFilters({ unreadOnly: checked })}
      />
    </div>
  )
}
