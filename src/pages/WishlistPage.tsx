import { NavBar } from '../components/NavBar/NavBar'
import { CompanyCard } from '../components/CompanyCard/CompanyCard'
import { SourceCard } from '../components/SourceCard/SourceCard'
import { AddCompanyModal } from '../components/AddCompanyModal/AddCompanyModal'
import { AddSourceModal } from '../components/AddSourceModal/AddSourceModal'
import { useCompanies } from '../hooks/useCompanies'
import { useSources } from '../hooks/useSources'
import { useUIContext } from '../contexts/UIContext'

export const WishlistPage = () => {
  const { data: companies = [] } = useCompanies()
  const { data: sources = [] } = useSources()
  const { setCompanyModalOpen, setSourceModalOpen } = useUIContext()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-base">Empresas</h2>
            <button
              onClick={() => setCompanyModalOpen(true)}
              aria-label="Adicionar empresa"
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
            >
              + Adicionar empresa
            </button>
          </div>
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-base">Fontes de scraping</h2>
            <button
              onClick={() => setSourceModalOpen(true)}
              aria-label="Adicionar fonte"
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
            >
              + Adicionar fonte
            </button>
          </div>
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </section>
      </main>

      <AddCompanyModal />
      <AddSourceModal />
    </div>
  )
}
