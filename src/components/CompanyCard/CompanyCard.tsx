import { RemoteBrazilBadge } from '../RemoteBrazilBadge/RemoteBrazilBadge'
import { NetworkingButton } from '../NetworkingButton/NetworkingButton'
import { useDeleteCompany } from '../../hooks/useCompanyMutations'
import { useUIContext } from '../../contexts/UIContext'
import type { Company } from '../../types'

interface Props {
  company: Company
}

export const CompanyCard = ({ company }: Props) => {
  const { mutate: deleteCompany } = useDeleteCompany()
  const { setEditingCompany, setCompanyModalOpen } = useUIContext()

  const handleEdit = () => {
    setEditingCompany(company)
    setCompanyModalOpen(true)
  }

  return (
    <article className="bg-brand-surface border-2 border-brand-green/20 rounded-3xl p-5 flex flex-col gap-2 transition-all duration-300 hover:border-brand-green/60 hover:shadow-neon-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-semibold">{company.name}</span>
          <RemoteBrazilBadge status={company.remote_brazil} />
        </div>
        <NetworkingButton companyName={company.name} />
      </div>

      {company.website && (
        <a
          href={company.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-purple hover:text-brand-purple/80 underline underline-offset-2 truncate transition-all duration-300"
        >
          {company.website}
        </a>
      )}

      {company.notes && <p className="text-gray-500 text-xs">{company.notes}</p>}

      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={handleEdit}
          aria-label="Editar"
          className="text-xs text-gray-400 hover:text-brand-green transition-all duration-300"
        >
          Editar
        </button>
        <button
          onClick={() => deleteCompany(company.id)}
          aria-label="Excluir"
          className="text-xs text-brand-pink hover:text-brand-pink/80 transition-all duration-300"
        >
          Excluir
        </button>
      </div>
    </article>
  )
}
