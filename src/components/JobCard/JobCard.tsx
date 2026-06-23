import { ScoreBadge } from '../ScoreBadge/ScoreBadge'
import { RemoteBrazilBadge } from '../RemoteBrazilBadge/RemoteBrazilBadge'
import { StatusDropdown } from '../StatusDropdown/StatusDropdown'
import { NetworkingButton } from '../NetworkingButton/NetworkingButton'
import { useUpdateJobStatus } from '../../hooks/useUpdateJobStatus'
import { useToggleJobRead } from '../../hooks/useToggleJobRead'
import { relativeDate } from '../../utils/relativeDate'
import type { Job } from '../../types'

interface Props {
  job: Job
}

export const JobCard = ({ job }: Props) => {
  const { mutate: updateStatus } = useUpdateJobStatus()
  const { mutate: toggleRead } = useToggleJobRead()

  return (
    <article
      className={`bg-brand-surface rounded-3xl border-2 p-5 flex flex-col gap-3 transition-all duration-300 hover:border-brand-green/60 hover:shadow-neon-card ${
        job.read ? 'border-brand-gray/20' : 'border-brand-green/20'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {!job.read && (
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full bg-brand-green shadow-neon-active"
            title="Não lida"
          />
        )}
        {job.relevance_level && <ScoreBadge level={job.relevance_level} />}
        {job.is_wishlist_company && job.wishlist_remote_brazil && (
          <RemoteBrazilBadge status={job.wishlist_remote_brazil} />
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label={job.read ? 'Marcar como não lida' : 'Marcar como lida'}
            onClick={() => toggleRead({ id: job.id, read: !job.read })}
            className="text-xs text-gray-400 hover:text-brand-green border-2 border-brand-gray/30 hover:border-brand-green/60 rounded-2xl px-3 py-1 transition-all duration-300"
          >
            {job.read ? 'Não lida' : 'Lida'}
          </button>
          <StatusDropdown
            value={job.status}
            onChange={(status) => updateStatus({ id: job.id, status })}
          />
        </div>
      </div>

      <div>
        <h2
          className={`text-base leading-tight ${
            job.read ? 'text-gray-200 font-medium' : 'text-white font-semibold'
          }`}
        >
          {job.title}
        </h2>
        <p className="text-gray-400 text-sm mt-0.5">
          {job.company}
          {job.location && <span className="text-gray-600"> · {job.location}</span>}
        </p>
        <p className="text-gray-600 text-xs mt-1">adicionado {relativeDate(job.scraped_at)}</p>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-green hover:text-brand-green/80 underline underline-offset-2 transition-all duration-300"
        >
          Ver vaga
        </a>
        <NetworkingButton companyName={job.company} />
      </div>
    </article>
  )
}
