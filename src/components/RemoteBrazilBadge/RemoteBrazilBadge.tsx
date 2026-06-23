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
  yes: 'bg-brand-green/15 text-brand-green border border-brand-green/30',
  unknown: 'bg-brand-gray/15 text-gray-400 border border-brand-gray/30',
  no: 'bg-brand-pink/15 text-brand-pink border border-brand-pink/30',
}

export const RemoteBrazilBadge = ({ status }: Props) => (
  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${COLOR[status]}`}>
    {LABEL[status]}
  </span>
)
