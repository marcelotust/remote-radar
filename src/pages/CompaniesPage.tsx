import { CompanyCard } from '../components/CompanyCard/CompanyCard'
import { AddCompanyModal } from '../components/AddCompanyModal/AddCompanyModal'
import { useCompanies } from '../hooks/useCompanies'
import { useUIContext } from '../contexts/UIContext'

export const CompaniesPage = () => {
  const { data: companies = [] } = useCompanies()
  const { setCompanyModalOpen } = useUIContext()

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Empresas</h2>
          <button
            onClick={() => setCompanyModalOpen(true)}
            aria-label="Adicionar empresa"
            className="px-4 py-1.5 text-sm bg-brand-green text-black font-medium rounded-2xl hover:shadow-neon-active transition-all duration-300"
          >
            + Adicionar empresa
          </button>
        </div>
        {companies.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </main>

      <AddCompanyModal />
    </>
  )
}
