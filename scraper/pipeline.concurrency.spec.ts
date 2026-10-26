import { describe, it, expect, vi } from 'vitest'
import { runScrape } from './pipeline.ts'
import { baseDeps } from './pipelineTestUtils.ts'

describe('runScrape concurrency', () => {
  const manySources = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ url: `https://s${i}.com`, label: `S${i}` }))

  it('renders sources concurrently up to the concurrency limit', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const renderPage = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          inFlight += 1
          maxInFlight = Math.max(maxInFlight, inFlight)
          setTimeout(() => {
            inFlight -= 1
            resolve('<html></html>')
          }, 5)
        })
    )
    const summary = await runScrape(
      baseDeps({ fetchActiveSources: async () => manySources(6), renderPage, concurrency: 3 })
    )
    expect(renderPage).toHaveBeenCalledTimes(6)
    expect(maxInFlight).toBe(3)
    expect(summary.sources).toBe(6)
    expect(summary.inserted).toBe(6)
  })

  it('keeps perSource in input order even when sources finish out of order', async () => {
    const sources = manySources(4)
    // s0 renders slowest, s3 fastest — finishing order is the reverse of input order
    const renderPage = vi.fn(
      (url: string) =>
        new Promise<string>((resolve) => {
          const idx = Number(url.match(/s(\d+)/)![1])
          setTimeout(() => resolve('<html></html>'), (4 - idx) * 5)
        })
    )
    const summary = await runScrape(
      baseDeps({ fetchActiveSources: async () => sources, renderPage, concurrency: 4 })
    )
    expect(summary.perSource.map((r) => r.url)).toEqual([
      'https://s0.com',
      'https://s1.com',
      'https://s2.com',
      'https://s3.com',
    ])
    expect(summary.failedSources).toBe(0)
  })
})
