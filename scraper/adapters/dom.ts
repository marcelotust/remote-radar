/** Collapse internal whitespace and trim an element's text content, or null. */
export const text = (el: Element | null): string | null =>
  el?.textContent?.replace(/\s+/g, ' ').trim() || null
