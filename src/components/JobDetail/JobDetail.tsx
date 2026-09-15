import { ScoreBadge } from '../ScoreBadge/ScoreBadge'
import { StatusDropdown } from '../StatusDropdown/StatusDropdown'
import { NetworkingButton } from '../NetworkingButton/NetworkingButton'
import { useUpdateJobStatus } from '../../hooks/useUpdateJobStatus'
import { useToggleJobRead } from '../../hooks/useToggleJobRead'
import { relativeDate } from '../../utils/relativeDate'
import type { Job } from '../../types'

interface Props {
  job: Job
}

/**
 * Shared job detail content (#9), rendered by both the mobile BottomSheet and
 * the desktop split-view panel — single source of truth for the detail UI.
 */
export const JobDetail = ({ job }: Props) => {
  const { mutate: updateStatus } = useUpdateJobStatus()
  const { mutate: toggleRead } = useToggleJobRead()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {job.relevance_level && <ScoreBadge level={job.relevance_level} />}
      </div>

      <div>
        <h2 className="text-lg font-semibold leading-tight text-white">{job.title}</h2>
        <p className="mt-1 text-sm text-gray-400">
          {job.company}
          {job.location && <span className="text-gray-600"> · {job.location}</span>}
        </p>
        <p className="mt-1 text-xs text-gray-600">adicionado {relativeDate(job.scraped_at)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusDropdown
          value={job.status}
          onChange={(status) => updateStatus({ id: job.id, status })}
        />
        <button
          type="button"
          aria-label={job.read ? 'Marcar como não lida' : 'Marcar como lida'}
          onClick={() => toggleRead({ id: job.id, read: !job.read })}
          className="rounded-2xl border-2 border-brand-gray/30 px-3 py-1 text-xs text-gray-400 transition-all duration-300 hover:border-brand-green/60 hover:text-brand-green"
        >
          {job.read ? 'Não lida' : 'Lida'}
        </button>
      </div>

      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">
        {job.description ?? 'Sem descrição disponível.'}
      </p>

      <div className="flex items-center gap-2">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-green underline underline-offset-2 transition-all duration-300 hover:text-brand-green/80"
        >
          Ver vaga
        </a>
        <NetworkingButton companyName={job.company} />
      </div>
    </div>
  )
}
