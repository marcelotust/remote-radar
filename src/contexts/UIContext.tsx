import { createContext, useContext, useState } from 'react'
import type { ScrapingSource, FilterState } from '../types'

interface UIContextValue {
  filters: FilterState
  setFilters: (partial: Partial<FilterState>) => void
  sourceModalOpen: boolean
  setSourceModalOpen: (open: boolean) => void
  editingSource: ScrapingSource | null
  setEditingSource: (s: ScrapingSource | null) => void
}

const UIContext = createContext<UIContextValue | null>(null)

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
  const [filters, setFiltersState] = useState<FilterState>({
    status: 'all',
    relevance: 'all',
    unreadOnly: false,
  })
  const [sourceModalOpen, setSourceModalOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<ScrapingSource | null>(null)

  const setFilters = (partial: Partial<FilterState>) =>
    setFiltersState((prev) => ({ ...prev, ...partial }))

  return (
    <UIContext.Provider
      value={{
        filters,
        setFilters,
        sourceModalOpen,
        setSourceModalOpen,
        editingSource,
        setEditingSource,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export const useUIContext = (): UIContextValue => {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUIContext must be used within UIProvider')
  return ctx
}
