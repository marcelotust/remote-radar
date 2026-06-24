import { useEffect, useMemo, useState } from 'react'
import { FilterBar } from '../components/FilterBar/FilterBar'
import { JobRow } from '../components/JobRow/JobRow'
import { JobDetail } from '../components/JobDetail/JobDetail'
import { BottomSheet } from '../components/BottomSheet/BottomSheet'
import { useJobs } from '../hooks/useJobs'
import { useToggleJobRead } from '../hooks/useToggleJobRead'
import { useUIContext } from '../contexts/UIContext'
import { applyFilters } from './inboxFilters'
import { paginate } from '../utils/paginate'
import type { Job } from '../types'

const pageButtonClass =
  'rounded-2xl border-2 border-brand-gray/30 px-3 py-1 transition-all duration-300 hover:border-brand-green/60 hover:text-brand-green disabled:opacity-40 disabled:hover:border-brand-gray/30 disabled:hover:text-gray-400'

export const InboxPage = () => {
  const { data: jobs = [], isLoading } = useJobs()
  const { filters } = useUIContext()
  const { mutate: toggleRead } = useToggleJobRead()

  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  useEffect(() => {
    setPage(1)
    setSelectedId(null)
  }, [filters])

  // Keep the currently open job visible even if it stops matching the filter
  // (e.g. it just became "read" under the unread-only filter), so it doesn't
  // vanish from under the user. Released when the selection or filter changes
  // (the latter resets selectedId above).
  const visibleJobs = useMemo(() => {
    const filtered = applyFilters(jobs, filters)
    if (!selectedId || filtered.some((j) => j.id === selectedId)) return filtered
    if (!jobs.some((j) => j.id === selectedId)) return filtered
    const keep = new Set(filtered.map((j) => j.id))
    keep.add(selectedId)
    return jobs.filter((j) => keep.has(j.id))
  }, [jobs, filters, selectedId])

  const { pageItems, totalPages } = paginate(visibleJobs, page)
  const selectedJob = jobs.find((j) => j.id === selectedId) ?? null

  const [sheetJob, setSheetJob] = useState<Job | null>(null)
  useEffect(() => {
    if (selectedJob) setSheetJob(selectedJob)
  }, [selectedJob])

  const handleSelect = (job: Job) => {
    setSelectedId(job.id)
    if (!job.read) toggleRead({ id: job.id, read: true })
  }

  return (
    <>
      <FilterBar />
      <main className="mx-auto flex max-w-6xl flex-col px-4 py-6 lg:flex-row lg:items-start lg:gap-6">
        <div className="flex w-full flex-col gap-1 lg:w-2/5">
          {isLoading && <p className="text-sm text-gray-500">Carregando vagas...</p>}
          {!isLoading && visibleJobs.length === 0 && (
            <p className="text-sm text-gray-500">Nenhuma vaga encontrada.</p>
          )}
          {pageItems.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              selected={job.id === selectedId}
              onSelect={handleSelect}
            />
          ))}
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-3 text-sm text-gray-400">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className={pageButtonClass}
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
                className={pageButtonClass}
              >
                Próxima
              </button>
            </div>
          )}
        </div>

        <aside className="hidden rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6 lg:sticky lg:top-6 lg:block lg:w-3/5">
          {selectedJob ? (
            <JobDetail job={selectedJob} />
          ) : (
            <p className="text-sm text-gray-500">Selecione uma vaga para ver os detalhes.</p>
          )}
        </aside>
      </main>

      <BottomSheet open={!!selectedJob} onClose={() => setSelectedId(null)}>
        {sheetJob && <JobDetail job={sheetJob} />}
      </BottomSheet>
    </>
  )
}
