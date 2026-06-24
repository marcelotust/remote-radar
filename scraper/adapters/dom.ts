/** Collapse internal whitespace and trim an element's text content, or null. */
export const text = (el: Element | null): string | null =>
  el?.textContent?.replace(/\s+/g, ' ').trim() || null

/** ISO 8601 UTC date from a descendant `<time datetime>`, or null when absent/unparseable. */
export const dateTime = (root: Element | null): string | null => {
  const raw = root?.querySelector('time[datetime]')?.getAttribute('datetime')?.trim()
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
