// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { remoteok, parseRemoteOk } from './remoteok.ts'

const html = readFileSync(
  fileURLToPath(new URL('./__fixtures__/remoteok.html', import.meta.url)),
  'utf8'
)

describe('remoteok adapter', () => {
  it('targets the right host', () => {
    expect(remoteok.host).toBe('remoteok.com')
  })

  it('parses the JSON array and skips the leading legal notice', () => {
    const jobs = remoteok.parse(html)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Freelance Website Copywriter Content Strategist',
      company: 'N4 Studio',
      url: 'https://remoteOK.com/remote-jobs/remote-freelance-website-copywriter-content-strategist-n4-studior-1133968',
      location: 'Sydney, Sydney, New South Wales, Australia',
      description: 'Write copy.',
      published_at: '2026-06-10T12:30:00.000Z',
    })
    expect(jobs[1].company).toBe('24-MAG')
  })

  it('extracts date as published_at, null when absent', () => {
    const jobs = parseRemoteOk(html)
    expect(jobs[0].published_at).toBe('2026-06-10T12:30:00.000Z')
    expect(jobs[1].published_at).toBeNull()
  })

  it('does not throw and yields published_at: null for a present-but-garbage date', () => {
    const html = `<pre>${JSON.stringify([
      { position: 'Dev', company: 'Acme', url: 'https://acme.com/1', date: 'soon' },
    ])}</pre>`
    expect(() => parseRemoteOk(html)).not.toThrow()
    const jobs = parseRemoteOk(html)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].published_at).toBeNull()
  })
})
