import { createContext, useContext, useState } from 'react'
import type { Company, ScrapingSource, FilterState } from '../types'

interface UIContextValue {
  filters: FilterState
  setFilters: (partial: Partial<FilterState>) => void
  companyModalOpen: boolean
  setCompanyModalOpen: (open: boolean) => void
  sourceModalOpen: boolean
  setSourceModalOpen: (open: boolean) => void
  editingCompany: Company | null
  setEditingCompany: (c: Company | null) => void
  editingSource: ScrapingSource | null
  setEditingSource: (s: ScrapingSource | null) => void
}

const UIContext = createContext<UIContextValue | null>(null)

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
  const [filters, setFiltersState] = useState<FilterState>({
    status: 'all',
    relevance: 'all',
    wishlistOnly: false,
    unreadOnly: false,
  })
  const [companyModalOpen, setCompanyModalOpen] = useState(false)
  const [sourceModalOpen, setSourceModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editingSource, setEditingSource] = useState<ScrapingSource | null>(null)

  const setFilters = (partial: Partial<FilterState>) =>
    setFiltersState((prev) => ({ ...prev, ...partial }))

  return (
    <UIContext.Provider
      value={{
        filters,
        setFilters,
        companyModalOpen,
        setCompanyModalOpen,
        sourceModalOpen,
        setSourceModalOpen,
        editingCompany,
        setEditingCompany,
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
