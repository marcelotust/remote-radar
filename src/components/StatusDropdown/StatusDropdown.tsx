import type { JobStatus } from '../../types'

interface Props {
  value: JobStatus
  onChange: (status: JobStatus) => void
}

const OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'none', label: 'Sem status' },
  { value: 'applied', label: 'Candidatado' },
  { value: 'dismissed', label: 'Descartado' },
]

export const StatusDropdown = ({ value, onChange }: Props) => (
  <select
    aria-label="Status da vaga"
    value={value}
    onChange={(e) => onChange(e.target.value as JobStatus)}
    className="bg-brand-input text-gray-300 text-xs rounded-2xl px-3 py-1.5 border-2 border-brand-green/20 transition-all duration-300 focus:outline-none focus:border-brand-green focus:bg-brand-green/5 focus:shadow-neon-input"
  >
    {OPTIONS.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
)
