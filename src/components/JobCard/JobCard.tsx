import { ScoreBadge } from '../ScoreBadge/ScoreBadge'
import { RemoteBrazilBadge } from '../RemoteBrazilBadge/RemoteBrazilBadge'
import { StatusDropdown } from '../StatusDropdown/StatusDropdown'
import { NetworkingButton } from '../NetworkingButton/NetworkingButton'
import { useUpdateJobStatus } from '../../hooks/useUpdateJobStatus'
import type { Job } from '../../types'

interface Props {
  job: Job
}

export const JobCard = ({ job }: Props) => {
  const { mutate: updateStatus } = useUpdateJobStatus()

  return (
    <article className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-3 hover:border-gray-700 transition-colors">
      <div className="flex items-center gap-2 flex-wrap">
        {job.relevance_level && <ScoreBadge level={job.relevance_level} />}
        {job.is_wishlist_company && job.wishlist_remote_brazil && (
          <RemoteBrazilBadge status={job.wishlist_remote_brazil} />
        )}
        <div className="ml-auto">
          <StatusDropdown
            value={job.status}
            onChange={(status) => updateStatus({ id: job.id, status })}
          />
        </div>
      </div>

      <div>
        <h2 className="text-white font-semibold text-base leading-tight">{job.title}</h2>
        <p className="text-gray-400 text-sm mt-0.5">
          {job.company}
          {job.location && <span className="text-gray-600"> · {job.location}</span>}
        </p>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Ver vaga
        </a>
        <NetworkingButton companyName={job.company} />
      </div>
    </article>
  )
}
