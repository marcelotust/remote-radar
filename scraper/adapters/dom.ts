/** Collapse internal whitespace and trim an element's text content, or null. */
export const text = (el: Element | null): string | null =>
  el?.textContent?.replace(/\s+/g, ' ').trim() || null

/** Normalize a raw date string to ISO 8601 UTC, or null when absent/empty/unparseable. */
export const toIsoOrNull = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** ISO 8601 UTC date from a descendant `<time datetime>`, or null when absent/unparseable. */
export const dateTime = (root: Element | null): string | null => {
  const rawAttr = root?.querySelector('time[datetime]')?.getAttribute('datetime')?.trim()
  return toIsoOrNull(rawAttr)
}
