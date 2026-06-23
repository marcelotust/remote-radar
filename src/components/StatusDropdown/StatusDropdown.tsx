import { Select } from '../Select/Select'
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
  <Select value={value} onChange={onChange} options={OPTIONS} ariaLabel="Status da vaga" />
)
