import { ScoreBadge } from '../ScoreBadge/ScoreBadge'
import { relativeDate } from '../../utils/relativeDate'
import type { Job } from '../../types'

interface Props {
  job: Job
  selected: boolean
  onSelect: (job: Job) => void
}

/**
 * High-density inbox row (#9). Two compact lines with graceful truncation;
 * the unread dot glows, read rows dim, and the selected row is highlighted.
 */
export const JobRow = ({ job, selected, onSelect }: Props) => (
  <button
    type="button"
    onClick={() => onSelect(job)}
    className={`flex w-full flex-col gap-1 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-300 ${
      selected
        ? 'border-brand-green/60 bg-brand-green/5'
        : 'border-transparent hover:border-brand-green/30'
    }`}
  >
    <div className="flex min-w-0 items-center gap-2">
      {!job.read && (
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full bg-brand-green shadow-[0_0_8px_#90EDA2]"
        />
      )}
      <span
        className={`min-w-0 truncate text-sm ${
          job.read ? 'font-normal text-gray-500' : 'font-semibold text-gray-100'
        }`}
      >
        {job.title}
      </span>
      {job.relevance_level && (
        <span className="ml-auto shrink-0">
          <ScoreBadge level={job.relevance_level} />
        </span>
      )}
    </div>
    <div className="flex min-w-0 items-center gap-1 text-xs text-gray-500">
      <span className="min-w-0 truncate">{job.company}</span>
      {job.location && <span className="min-w-0 truncate">· {job.location}</span>}
      <span className="ml-auto shrink-0">{relativeDate(job.scraped_at)}</span>
    </div>
  </button>
)
