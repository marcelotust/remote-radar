import { useNetworkingDork } from '../../hooks/useNetworkingDork'

interface Props {
  companyName: string
}

export const NetworkingButton = ({ companyName }: Props) => {
  const url = useNetworkingDork(companyName)

  return (
    <button
      onClick={() => window.open(url, '_blank')}
      title={`Buscar profissionais da ${companyName} no Google`}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
    >
      🔗 Networking
    </button>
  )
}
