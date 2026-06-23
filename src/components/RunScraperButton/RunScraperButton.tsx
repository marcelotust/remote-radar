export const RunScraperButton = () => {
  const url = import.meta.env.VITE_GITHUB_WORKFLOW_URL as string | undefined
  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Run scraper"
      className="px-4 py-1.5 text-sm bg-brand-green text-black font-medium rounded-2xl hover:shadow-neon-active transition-all duration-300"
    >
      Run scraper
    </a>
  )
}
