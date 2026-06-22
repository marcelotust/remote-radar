export const RunScraperButton = () => {
  const url = import.meta.env.VITE_GITHUB_WORKFLOW_URL as string | undefined
  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Run scraper"
      className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-500 transition-colors"
    >
      Run scraper
    </a>
  )
}
