import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { JobDetail } from './JobDetail'
import { AuthProvider } from '../../contexts/AuthContext'
import type { Job } from '../../types'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </AuthProvider>
  )
}

const baseJob: Job = {
  id: 'j1',
  title: 'Senior Frontend Engineer',
  company: 'Stripe',
  url: 'https://stripe.com/jobs/1',
  location: 'Remote',
  description: 'Build the dashboard with React and TypeScript.',
  posted_at: '2026-06-19T00:00:00Z',
  scraped_at: '2026-06-20T06:00:00Z',
  status: 'none',
  read: false,
  source_url: null,
  relevance_score: 3,
  relevance_level: 'high',
  is_wishlist_company: true,
  wishlist_remote_brazil: 'yes',
}

describe('JobDetail', () => {
  it('renders the title, company and full description', () => {
    render(<JobDetail job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    expect(screen.getByText('Stripe')).toBeInTheDocument()
    expect(screen.getByText('Build the dashboard with React and TypeScript.')).toBeInTheDocument()
  })

  it('falls back to a placeholder when description is null', () => {
    render(<JobDetail job={{ ...baseJob, description: null }} />, { wrapper: makeWrapper() })
    expect(screen.getByText(/sem descrição disponível/i)).toBeInTheDocument()
  })

  it('links to the original posting', () => {
    render(<JobDetail job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('link', { name: /ver vaga/i })).toHaveAttribute(
      'href',
      'https://stripe.com/jobs/1'
    )
  })

  it('renders the status dropdown and read toggle', () => {
    render(<JobDetail job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('combobox', { name: /status da vaga/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /marcar como lida/i })).toBeInTheDocument()
  })

  it('shows the RemoteBrazilBadge for wishlist companies', () => {
    render(<JobDetail job={baseJob} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Remote Brasil ✓')).toBeInTheDocument()
  })
})
