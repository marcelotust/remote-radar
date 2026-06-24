export interface RawJob {
  title: string
  company: string
  url: string
  location: string | null
  description: string | null
}

export interface FetchContext {
  httpGet: (
    url: string,
    headers?: Record<string, string>
  ) => Promise<{ status: number; body: string }>
}

export interface Adapter {
  /** Bare hostname (no `www.`), or '*' for the generic fallback. */
  host: string
  /** Selector to wait for before capturing HTML. Required for renderPage adapters. */
  readySelector?: string
  /** Optional API fetch. When present, the pipeline uses it instead of renderPage. */
  fetch?(url: string, ctx: FetchContext): Promise<string>
  /** Pure extraction from fetched content (HTML or JSON). No network, no async. */
  parse(content: string): RawJob[]
}
