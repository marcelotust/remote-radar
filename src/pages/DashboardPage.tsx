import { useMemo } from 'react'
import { NavBar } from '../components/NavBar/NavBar'
import { FilterBar } from '../components/FilterBar/FilterBar'
import { JobCard } from '../components/JobCard/JobCard'
import { useJobs } from '../hooks/useJobs'
import { useUIContext } from '../contexts/UIContext'
import { applyFilters } from './dashboardFilters'

export const DashboardPage = () => {
  const { data: jobs = [], isLoading } = useJobs()
  const { filters } = useUIContext()

  const filteredJobs = useMemo(() => applyFilters(jobs, filters), [jobs, filters])

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <FilterBar />
      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4">
        {isLoading && <p className="text-gray-500 text-sm">Carregando vagas...</p>}
        {!isLoading && filteredJobs.length === 0 && (
          <p className="text-gray-500 text-sm">Nenhuma vaga encontrada.</p>
        )}
        {filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </main>
    </div>
  )
}
