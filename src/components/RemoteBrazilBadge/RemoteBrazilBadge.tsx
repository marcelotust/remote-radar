import type { RemoteBrazilStatus } from '../../types'

interface Props {
  status: RemoteBrazilStatus
}

const LABEL: Record<RemoteBrazilStatus, string> = {
  yes: 'Remote Brasil ✓',
  unknown: 'Não confirmado',
  no: 'Não contrata remoto',
}

const COLOR: Record<RemoteBrazilStatus, string> = {
  yes: 'bg-green-500/20 text-green-400',
  unknown: 'bg-gray-500/20 text-gray-400',
  no: 'bg-red-500/20 text-red-400',
}

export const RemoteBrazilBadge = ({ status }: Props) => (
  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${COLOR[status]}`}>
    {LABEL[status]}
  </span>
)
