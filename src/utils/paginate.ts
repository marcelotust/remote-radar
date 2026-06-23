export const PAGE_SIZE = 50

export const paginate = <T>(
  items: T[],
  page: number,
  size = PAGE_SIZE
): { pageItems: T[]; totalPages: number } => {
  const totalPages = Math.max(1, Math.ceil(items.length / size))
  const clamped = Math.min(Math.max(page, 1), totalPages)
  const start = (clamped - 1) * size
  return { pageItems: items.slice(start, start + size), totalPages }
}
