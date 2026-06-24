import { SourceCard } from '../components/SourceCard/SourceCard'
import { AddSourceModal } from '../components/AddSourceModal/AddSourceModal'
import { RunScraperButton } from '../components/RunScraperButton/RunScraperButton'
import { useSources } from '../hooks/useSources'
import { useUIContext } from '../contexts/UIContext'

export const ScrapingSourcesPage = () => {
  const { data: sources = [] } = useSources()
  const { setSourceModalOpen } = useUIContext()

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Fontes de scraping</h2>
          <div className="flex items-center gap-2">
            <RunScraperButton />
            <button
              onClick={() => setSourceModalOpen(true)}
              aria-label="Adicionar fonte"
              className="px-4 py-1.5 text-sm bg-brand-green text-black font-medium rounded-2xl hover:shadow-neon-active transition-all duration-300"
            >
              + Adicionar fonte
            </button>
          </div>
        </div>
        {sources.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </main>

      <AddSourceModal />
    </>
  )
}
