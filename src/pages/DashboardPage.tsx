import { useEffect, useMemo, useState } from 'react'
import { NavBar } from '../components/NavBar/NavBar'
import { FilterBar } from '../components/FilterBar/FilterBar'
import { JobCard } from '../components/JobCard/JobCard'
import { useJobs } from '../hooks/useJobs'
import { useUIContext } from '../contexts/UIContext'
import { applyFilters } from './dashboardFilters'
import { paginate } from '../utils/paginate'

export const DashboardPage = () => {
  const { data: jobs = [], isLoading } = useJobs()
  const { filters } = useUIContext()

  const filteredJobs = useMemo(() => applyFilters(jobs, filters), [jobs, filters])

  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [filters])
  const { pageItems, totalPages } = paginate(filteredJobs, page)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <FilterBar />
      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4">
        {isLoading && <p className="text-gray-500 text-sm">Carregando vagas...</p>}
        {!isLoading && filteredJobs.length === 0 && (
          <p className="text-gray-500 text-sm">Nenhuma vaga encontrada.</p>
        )}
        {pageItems.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-2 text-sm text-gray-400">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="border border-gray-700 rounded px-3 py-1 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors"
            >
              Anterior
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="border border-gray-700 rounded px-3 py-1 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors"
            >
              Próxima
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
