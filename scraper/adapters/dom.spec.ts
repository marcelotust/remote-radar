// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { JSDOM } from 'jsdom'
import { text, dateTime } from './dom.ts'

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

describe('dateTime', () => {
  it('extracts and normalizes a descendant <time datetime> to ISO UTC', () => {
    expect(dateTime(el('<a><time datetime="2026-06-01T12:00:00+02:00"></time></a>'))).toBe(
      '2026-06-01T10:00:00.000Z'
    )
  })

  it('returns null when there is no time element', () => {
    expect(dateTime(el('<a><span>no date</span></a>'))).toBeNull()
  })

  it('returns null for an empty or unparseable datetime', () => {
    expect(dateTime(el('<a><time datetime=""></time></a>'))).toBeNull()
    expect(dateTime(el('<a><time datetime="3 days ago"></time></a>'))).toBeNull()
  })

  it('returns null for a null root', () => {
    expect(dateTime(null)).toBeNull()
  })
})
