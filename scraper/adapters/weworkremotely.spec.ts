// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  weworkremotely,
  parseWeWorkRemotely,
  fetchWeWorkRemotely,
  WWR_FEEDS,
} from './weworkremotely.ts'

const xml = readFileSync(
  fileURLToPath(new URL('./__fixtures__/weworkremotely.xml', import.meta.url)),
  'utf8'
)
const oneFeed = JSON.stringify([xml])

describe('weworkremotely adapter', () => {
  it('targets the right host and fetches over HTTP instead of rendering', () => {
    expect(weworkremotely.host).toBe('weworkremotely.com')
    expect(weworkremotely.fetch).toBeDefined()
    expect(weworkremotely.readySelector).toBeUndefined()
  })

  it('fetches every software category feed and fails loudly on an HTTP error', async () => {
    const calls: string[] = []
    const body = await fetchWeWorkRemotely(async (url) => {
      calls.push(url)
      return { status: 200, body: xml }
    })
    expect(calls).toEqual(WWR_FEEDS)
    expect(JSON.parse(body)).toHaveLength(WWR_FEEDS.length)

    await expect(
      fetchWeWorkRemotely(async (url) => ({ status: url === WWR_FEEDS[1] ? 503 : 200, body: xml }))
    ).rejects.toThrow(`We Work Remotely RSS 503 for ${WWR_FEEDS[1]}`)
  })

  it('splits "Company: Role" titles and reads region, falling back to country', () => {
    const jobs = parseWeWorkRemotely(oneFeed)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Frontend Engineer, Ads',
      company: 'Reddit',
      url: 'https://weworkremotely.com/remote-jobs/reddit-frontend-engineer-ads',
      location: 'Anywhere in the World',
      description: 'Headquarters: Remote Build ad experiences in React.',
      published_at: '2026-10-26T07:31:27.000Z',
    })
    expect(jobs[1]).toMatchObject({
      title: 'Senior Fullstack Developer (Python)',
      company: 'Proxify AB',
      location: 'Sweden',
      description: null,
      published_at: null,
    })
  })

  it('dedupes a listing that appears in more than one category feed', () => {
    expect(parseWeWorkRemotely(JSON.stringify([xml, xml]))).toHaveLength(2)
  })

  it('returns no jobs for content that is not a JSON array of feeds', () => {
    expect(parseWeWorkRemotely(xml)).toEqual([])
    expect(parseWeWorkRemotely('{}')).toEqual([])
  })
})
