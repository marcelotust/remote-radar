export interface RawJob {
  title: string
  company: string
  url: string
  location: string | null
  description: string | null
}

export interface Adapter {
  /** Bare hostname (no `www.`), or '*' for the generic fallback. */
  host: string
  /** Selector to wait for before capturing HTML (proves dynamic content rendered). */
  readySelector: string
  /** Pure extraction from rendered HTML. No network, no async. */
  parse(html: string): RawJob[]
}
