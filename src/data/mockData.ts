import type { Job, Company, ScrapingSource } from '../types'

export const MOCK_COMPANIES: Company[] = [
  {
    id: 'c1',
    name: 'Stripe',
    website: 'https://stripe.com',
    notes: 'Strong eng culture, fully remote',
    remote_brazil: 'yes',
    created_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'c2',
    name: 'Cloudflare',
    website: 'https://cloudflare.com',
    notes: null,
    remote_brazil: 'unknown',
    created_at: '2026-06-05T00:00:00Z',
  },
  {
    id: 'c3',
    name: 'Acme Corp',
    website: null,
    notes: 'Only hires US-based',
    remote_brazil: 'no',
    created_at: '2026-06-10T00:00:00Z',
  },
]

export const MOCK_SOURCES: ScrapingSource[] = [
  {
    id: 's1',
    url: 'https://jobs.lever.co',
    label: 'Lever Jobs',
    is_active: true,
    created_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 's2',
    url: 'https://boards.greenhouse.io',
    label: 'Greenhouse',
    is_active: true,
    created_at: '2026-06-01T00:00:00Z',
  },
]

export const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    title: 'Senior Frontend Engineer',
    company: 'Stripe',
    url: 'https://stripe.com/jobs/1',
    location: 'Remote',
    description: 'We are looking for a React TypeScript engineer with Next.js experience.',
    posted_at: '2026-06-19T00:00:00Z',
    scraped_at: '2026-06-20T06:00:00Z',
    status: 'none',
    read: false,
    source_url: 'https://jobs.lever.co',
  },
  {
    id: 'j2',
    title: 'Full Stack Developer',
    company: 'Cloudflare',
    url: 'https://cloudflare.com/jobs/2',
    location: 'Remote',
    description: 'PHP and Java backend with some frontend work.',
    posted_at: '2026-06-18T00:00:00Z',
    scraped_at: '2026-06-20T06:00:00Z',
    status: 'none',
    read: false,
    source_url: 'https://boards.greenhouse.io',
  },
  {
    id: 'j3',
    title: 'React Developer',
    company: 'Tech Startup',
    url: 'https://techstartup.com/jobs/3',
    location: 'Presencial São Paulo',
    description: 'React frontend developer. Must work presencial.',
    posted_at: '2026-06-17T00:00:00Z',
    scraped_at: '2026-06-20T06:00:00Z',
    status: 'none',
    read: true,
    source_url: 'https://jobs.lever.co',
  },
]
