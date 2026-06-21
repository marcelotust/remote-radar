import type { JobStatus } from '../../types'

interface Props {
  value: JobStatus
  onChange: (status: JobStatus) => void
}

const OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'unseen', label: 'Não visto' },
  { value: 'seen', label: 'Visto' },
  { value: 'applied', label: 'Candidatado' },
  { value: 'dismissed', label: 'Descartado' },
]

export const StatusDropdown = ({ value, onChange }: Props) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as JobStatus)}
    className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-600"
  >
    {OPTIONS.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
)
