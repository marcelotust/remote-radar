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
      className="flex items-center gap-1 px-2.5 py-1 rounded-2xl text-xs text-brand-purple hover:text-brand-purple hover:bg-brand-purple/10 transition-all duration-300"
    >
      🔗 Networking
    </button>
  )
}
