// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { remotive } from './remotive.ts'

const html = readFileSync(
  fileURLToPath(new URL('./__fixtures__/remotive.html', import.meta.url)),
  'utf8'
)

describe('remotive adapter', () => {
  it('targets the right host', () => {
    expect(remotive.host).toBe('remotive.com')
  })

  it('parses the embedded JSON and skips entries missing required fields', () => {
    const jobs = remotive.parse(html)
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toEqual({
      title: 'Mid/Senior AI Cinematic Video Editor',
      company: 'EverAI',
      url: 'https://remotive.com/remote-jobs/artificial-intelligence/mid-senior-ai-cinematic-video-editor-2090887',
      location: 'Worldwide',
      description: '<p>Edit cinematic AI video.</p>',
    })
    expect(jobs[1].company).toBe('A.Team')
    expect(jobs[1].location).toBe('Americas, Europe, Israel')
  })
})
