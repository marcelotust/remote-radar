// Test-only seed data. The app fetches from Supabase at runtime (see
// src/lib/supabase.ts); these fixtures back the in-memory Supabase fake used in
// tests (src/lib/__mocks__/supabase.ts).
import type { Job, ScrapingSource, ScoringKeyword, ScoringSettings } from '../types'
import { DEFAULT_SCORING_CONFIG } from '../utils/keywords'

const SOURCE_SEED: { label: string; url: string }[] = [
  // Existentes
  { label: 'Lever Jobs', url: 'https://jobs.lever.co' },
  { label: 'Greenhouse', url: 'https://boards.greenhouse.io' },
  // Agregador Generalista
  { label: 'LinkedIn', url: 'https://www.linkedin.com' },
  { label: 'Indeed', url: 'https://www.indeed.com' },
  { label: 'Glassdoor', url: 'https://www.glassdoor.com' },
  { label: 'ZipRecruiter', url: 'https://www.ziprecruiter.com' },
  { label: 'Jobot', url: 'https://www.jobot.com' },
  // Tech e Startups
  { label: 'Wellfound', url: 'https://wellfound.com' },
  { label: 'Otta', url: 'https://otta.com' },
  { label: 'Built In', url: 'https://builtin.com' },
  { label: 'Dice', url: 'https://www.dice.com' },
  { label: 'Work at a Startup', url: 'https://www.workatstartup.com' },
  // Exclusivo Remoto
  { label: 'Remote OK', url: 'https://remoteok.com' },
  { label: 'We Work Remotely', url: 'https://weworkremotely.com' },
  { label: 'Remotive', url: 'https://remotive.io' },
  { label: 'Jobspresso', url: 'https://jobspresso.co' },
  { label: 'Working Nomads', url: 'https://www.workingnomads.com' },
  { label: 'JustRemote', url: 'https://justremote.co' },
  { label: 'EU Remote Jobs', url: 'https://euremotejobs.com' },
  // Nichos Específicos
  { label: 'JS Remotely', url: 'https://jsremotely.com' },
  { label: 'AI Jobs', url: 'https://theaijobboard.com' },
  { label: 'Remote Woman', url: 'https://remotewoman.com' },
  { label: 'Remote Circle', url: 'https://remotecircle.com' },
  { label: 'VanHack', url: 'https://vanhack.com' },
  { label: 'Work In Estonia', url: 'https://workinestonia.com/job' },
  // Marketplaces e Redes de Talentos
  { label: 'Toptal', url: 'https://www.toptal.com' },
  { label: 'Turing', url: 'https://www.turing.com' },
  { label: 'Arc.dev', url: 'https://arc.dev' },
  { label: 'Jobbers.io', url: 'https://jobbers.io' },
  { label: 'Lemon.io', url: 'https://lemon.io' },
  { label: 'CloudDevs', url: 'https://clouddevs.com' },
  { label: 'Gun.io', url: 'https://gun.io' },
  { label: 'Andela', url: 'https://andela.com' },
  { label: 'Upwork', url: 'https://www.upwork.com' },
  { label: 'Fiverr', url: 'https://www.fiverr.com' },
  { label: 'Braintrust', url: 'https://www.usebraintrust.com' },
  { label: 'Hubstaff Talent', url: 'https://hubstafftalent.net' },
  // Brasil e América Latina
  { label: 'Revelo', url: 'https://revelo.com.br' },
  { label: 'Tecla', url: 'https://www.tecla.io' },
  { label: 'Strider', url: 'https://onstrider.com' },
  { label: 'BairesDev', url: 'https://www.bairesdev.com' },
  { label: 'Remotar', url: 'https://remotar.com.br' },
  { label: 'JobNaGringa', url: 'https://www.jobnagringa.com.br' },
  { label: 'Workana', url: 'https://www.workana.com' },
  { label: 'FrontendBR Vagas', url: 'https://github.com/frontendbr/vagas' },
  { label: 'BackendBR Vagas', url: 'https://github.com/backend-br/vagas' },
]

export const MOCK_SOURCES: ScrapingSource[] = SOURCE_SEED.map((s, i) => ({
  id: `s${i + 1}`,
  url: s.url,
  label: s.label,
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
}))

export const MOCK_SCORING_KEYWORDS: ScoringKeyword[] = DEFAULT_SCORING_CONFIG.keywords.map(
  (k, i) => ({
    id: `sk${i + 1}`,
    user_id: null,
    created_at: '2026-06-01T00:00:00Z',
    ...k,
  })
)

export const MOCK_SCORING_SETTINGS: ScoringSettings[] = [
  {
    id: 'ss1',
    user_id: null,
    high_threshold: DEFAULT_SCORING_CONFIG.highThreshold,
    medium_threshold: DEFAULT_SCORING_CONFIG.mediumThreshold,
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
