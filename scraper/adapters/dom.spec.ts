// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { JSDOM } from 'jsdom'
import { text } from './dom.ts'

const el = (inner: string): Element | null =>
  new JSDOM(`<div>${inner}</div>`).window.document.querySelector('div')

describe('text', () => {
  it('returns null for a null element', () => {
    expect(text(null)).toBeNull()
  })

  it('collapses internal whitespace and trims', () => {
    expect(text(el('  Hello   \n  World  '))).toBe('Hello World')
  })

  it('returns null for whitespace-only content', () => {
    expect(text(el('   \n  '))).toBeNull()
  })
})
