// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { remoteok, parseRemoteOk, fetchRemoteOk, REMOTE_OK_API } from './remoteok.ts'

const json = readFileSync(
  fileURLToPath(new URL('./__fixtures__/remoteok.json', import.meta.url)),
  'utf8'
)

describe('remoteok adapter', () => {
  it('targets the right host and fetches over HTTP instead of rendering', () => {
    expect(remoteok.host).toBe('remoteok.com')
    expect(remoteok.fetch).toBeDefined()
    expect(remoteok.readySelector).toBeUndefined()
  })

  it('fetches the public API and fails loudly on an HTTP error', async () => {
    const calls: string[] = []
    const body = await fetchRemoteOk(async (url) => {
      calls.push(url)
      return { status: 200, body: json }
    })
    expect(calls).toEqual([REMOTE_OK_API])
    expect(body).toBe(json)

    await expect(fetchRemoteOk(async () => ({ status: 503, body: '' }))).rejects.toThrow(
      'Remote OK API 503'
    )
  })

  it('parses the JSON array, skips the leading legal notice and strips HTML', () => {
    const jobs = remoteok.parse(json)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Freelance Website Copywriter Content Strategist',
      company: 'N4 Studio',
      url: 'https://remoteOK.com/remote-jobs/remote-freelance-website-copywriter-content-strategist-n4-studior-1133968',
      location: 'Sydney, Sydney, New South Wales, Australia',
      description: 'Write copy.',
      published_at: '2026-06-10T12:30:00.000Z',
    })
    expect(jobs[1]).toMatchObject({ company: '24-MAG', location: null })
  })

  it('extracts date as published_at, null when absent', () => {
    const jobs = parseRemoteOk(json)
    expect(jobs[0].published_at).toBe('2026-06-10T12:30:00.000Z')
    expect(jobs[1].published_at).toBeNull()
  })

  it('does not throw and yields published_at: null for a present-but-garbage date', () => {
    const body = JSON.stringify([
      { position: 'Dev', company: 'Acme', url: 'https://acme.com/1', date: 'soon' },
    ])
    expect(() => parseRemoteOk(body)).not.toThrow()
    const jobs = parseRemoteOk(body)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].published_at).toBeNull()
  })

  it('returns no jobs for a body that is not a JSON array', () => {
    expect(parseRemoteOk('<html>blocked</html>')).toEqual([])
    expect(parseRemoteOk('{"error":"rate limited"}')).toEqual([])
  })
})
