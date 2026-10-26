import { describe, it, expect, vi } from 'vitest'
import { isDevRole } from './roleFilter.ts'
import { runScrape } from './pipeline.ts'
import type { RawJob } from './adapters/types.ts'

describe('isDevRole', () => {
  it.each([
    'Senior Frontend Engineer',
    'Full-Stack Engineer (Frontend Leaning) – Studio',
    'Staff Software Engineer, Tech Lead – NetBox Delivery',
    'Product Engineer - Passport',
    'Design Engineer',
    'Member of Technical Staff',
    'Senior React Native Developer',
    'Site Reliability Engineer (SRE)',
    'DevOps Engineer',
    'Data Engineer',
    'Salesforce Developer',
    'Dev Fullstack',
    'Desenvolvedor(a) Frontend Pleno',
    'Pessoa Desenvolvedora Back-end',
    'Engenheira de Software Sênior',
    'Desarrollador Full Stack',
    // "Manager" is the product here, not the job.
    'Senior Software Engineer, Privileged Access Management / Password Manager',
  ])('keeps %s', (title) => {
    expect(isDevRole(title)).toBe(true)
  })

  it.each([
    'Account Executive, Mid Market',
    'Senior UI/UX Designer – AI Assistants',
    'Junior Analytics Specialist',
    'Product Manager - Auth',
    'Audio Transcription Specialist (Portuguese language)',
    'Engineering Manager - Spark',
    'Senior Manager, Engineering',
    'Head of Data Engineering',
    'Director, GTM Engineering',
    'Staff Sales Engineer, Voice AI',
    'Solutions Engineer – EMEA',
    'Customer Support Engineer',
    'Developer Relations Engineer',
    'DevRel Lead',
    'Business Developer',
    'Engineering Recruiter',
    'Mechanical Engineer',
    'Engenheiro Civil',
  ])('drops %s', (title) => {
    expect(isDevRole(title)).toBe(false)
  })

  it('does not match role words inside other words', () => {
    expect(isDevRole('Swedish-speaking Account Manager')).toBe(false)
    expect(isDevRole('Developmental Editor')).toBe(false)
  })
})

describe('runScrape role filter', () => {
  it('only upserts software-development roles', async () => {
    const posting = (title: string, url: string): RawJob => ({
      title,
      company: 'C',
      url,
      location: null,
      description: null,
      published_at: null,
    })
    const upsertJobs = vi.fn(async (rows: unknown[]) => ({ count: rows.length }))
    const summary = await runScrape({
      fetchActiveSources: async () => [{ url: 'https://a.com', label: 'A' }],
      resolveAdapter: () => ({
        host: 'a.com',
        readySelector: 'body',
        parse: () => [
          posting('Senior Frontend Engineer', 'https://a.com/dev'),
          posting('Account Executive', 'https://a.com/sales'),
          posting('Engineering Manager', 'https://a.com/em'),
        ],
      }),
      renderPage: async () => '<html></html>',
      httpGet: async () => ({ status: 200, body: '' }),
      scoreJob: () => ({ relevance_score: 0, relevance_level: 'low' }),
      upsertJobs,
      recordSourceRun: async () => {},
    })

    expect(summary.extracted).toBe(1)
    const upserted = upsertJobs.mock.calls[0][0] as { url: string }[]
    expect(upserted.map((r) => r.url)).toEqual(['https://a.com/dev'])
  })
})
