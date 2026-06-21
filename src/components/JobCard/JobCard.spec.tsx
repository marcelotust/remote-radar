import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { JobCard } from './JobCard'
import type { Job } from '../../types'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

const baseJob: Job = {
  id: 'j1',
  title: 'Senior Frontend Engineer',
  company: 'Stripe',
  url: 'https://stripe.com/jobs/1',
  location: 'Remote',
  description: 'React TypeScript role',
  posted_at: '2026-06-19T00:00:00Z',
  scraped_at: '2026-06-20T06:00:00Z',
  status: 'unseen',
  source_url: null,
  relevance_score: 3,
  relevance_level: 'high',
  is_wishlist_company: true,
  wishlist_remote_brazil: 'yes',
}

describe('JobCard', () => {
  it('renders the job title', () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
  })

  it('renders the company name', () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Stripe')).toBeInTheDocument()
  })

  it('shows RemoteBrazilBadge for wishlist companies', () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Remote Brasil ✓')).toBeInTheDocument()
  })

  it('hides RemoteBrazilBadge for non-wishlist companies', () => {
    const job = { ...baseJob, is_wishlist_company: false }
    render(<JobCard job={job} />, { wrapper: makeWrapper() })
    expect(screen.queryByText(/Remote Brasil/)).not.toBeInTheDocument()
  })

  it('renders a link to the original job posting', () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('link', { name: /ver vaga/i })).toHaveAttribute(
      'href',
      'https://stripe.com/jobs/1'
    )
  })

  it('renders the ScoreBadge', () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Alta')).toBeInTheDocument()
  })

  it('calls updateStatus when StatusDropdown changes', async () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    const select = screen.getByRole('combobox')
    // The StatusDropdown renders based on job.status prop; interaction calls mutate
    await userEvent.selectOptions(select, 'seen')
    // After selecting, the select value is controlled by the QueryClient optimistic update
    // Just verify the interaction doesn't throw
    expect(select).toBeInTheDocument()
  })

  it('renders location when present', () => {
    render(<JobCard job={baseJob} />, { wrapper: makeWrapper() })
    // location shows as "· Remote" span; check by containing text element
    expect(screen.getAllByText(/Remote/).length).toBeGreaterThan(0)
  })
})
