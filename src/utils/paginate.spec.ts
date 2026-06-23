import { describe, it, expect } from 'vitest'
import { paginate, PAGE_SIZE } from './paginate'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('paginate', () => {
  it('exposes a page size of 50', () => {
    expect(PAGE_SIZE).toBe(50)
  })
  it('returns the first page and total page count', () => {
    const { pageItems, totalPages } = paginate(range(120), 1)
    expect(pageItems).toEqual(range(50))
    expect(totalPages).toBe(3)
  })
  it('returns the last partial page', () => {
    const { pageItems } = paginate(range(120), 3)
    expect(pageItems).toEqual(Array.from({ length: 20 }, (_, i) => 100 + i))
  })
  it('clamps a too-low page to 1', () => {
    expect(paginate(range(120), 0).pageItems).toEqual(range(50))
  })
  it('clamps a too-high page to the last page', () => {
    expect(paginate(range(120), 99).pageItems[0]).toBe(100)
  })
  it('treats an empty list as a single page', () => {
    expect(paginate([], 1)).toEqual({ pageItems: [], totalPages: 1 })
  })
})
