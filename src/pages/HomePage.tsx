import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useJobs } from '../hooks/useJobs'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export const HomePage = () => {
  const { data: jobs = [] } = useJobs()

  const newLastDay = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const cutoff = Date.now() - ONE_DAY_MS
    return jobs.filter((j) => new Date(j.scraped_at).getTime() >= cutoff).length
  }, [jobs])

  const unreadCount = useMemo(() => jobs.filter((j) => !j.read).length, [jobs])

  const highlights = useMemo(
    () =>
      jobs
        .filter((j) => j.status !== 'dismissed' && (j.relevance_score ?? 0) > 0)
        .sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
        .slice(0, 5),
    [jobs]
  )

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-8">
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6">
          <p className="text-3xl font-bold text-brand-green">{newLastDay}</p>
          <p className="text-sm text-gray-400">Vagas novas no último dia</p>
        </div>
        <div className="rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6">
          <p className="text-3xl font-bold text-brand-green">{unreadCount}</p>
          <p className="text-sm text-gray-400">Vagas não lidas</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Destaques</h2>
          <Link to="/inbox" className="text-sm text-brand-green hover:underline">
            Ver inbox
          </Link>
        </div>
        {highlights.length === 0 && <p className="text-sm text-gray-500">Nenhuma vaga ainda.</p>}
        {highlights.map((job) => (
          <Link
            key={job.id}
            to="/inbox"
            className="rounded-2xl border-2 border-brand-gray/30 px-4 py-3 transition-all duration-300 hover:border-brand-green/60"
          >
            <p className="text-white font-medium text-sm">{job.title}</p>
            <p className="text-xs text-gray-400">{job.company}</p>
          </Link>
        ))}
      </section>
    </main>
  )
}
