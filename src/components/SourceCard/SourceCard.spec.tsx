import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { SourceCard } from './SourceCard'
import { UIProvider } from '../../contexts/UIContext'
import { AuthProvider } from '../../contexts/AuthContext'
import { __setSupabaseSession } from '../../lib/__mocks__/supabase'
import type { ScrapingSource } from '../../types'

const source: ScrapingSource = {
  id: 's1',
  label: 'Lever Jobs',
  url: 'https://jobs.lever.co',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
}

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <QueryClientProvider client={qc}>
        <UIProvider>{children}</UIProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

describe('SourceCard', () => {
  it('renders the label', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Lever Jobs')).toBeInTheDocument()
  })

  it('renders the URL', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByText('https://jobs.lever.co')).toBeInTheDocument()
  })

  it('does not render a company-type badge when unclassified', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.queryByText(/startup|consultoria|produto|agregador/i)).not.toBeInTheDocument()
  })

  it('renders the company-type badge when classified', () => {
    const classified = { ...source, company_type: 'startup' as const }
    render(<SourceCard source={classified} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Startup')).toBeInTheDocument()
  })

  it('renders active toggle checked when is_active is true', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('has a delete button', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument()
  })

  it('has an edit button', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
  })

  it('clicking edit button does not throw', async () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
  })

  it('clicking delete button calls deleteSource without error', async () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    await userEvent.click(screen.getByRole('button', { name: /excluir/i }))
  })

  it('toggling checkbox calls editSource without error', async () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    await userEvent.click(screen.getByRole('checkbox'))
  })

  it('renders inactive checkbox when is_active is false', () => {
    const inactiveSource = { ...source, is_active: false }
    render(<SourceCard source={inactiveSource} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('shows "nunca" when the source has no last run', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Última run: nunca/)).toBeInTheDocument()
  })

  it('shows the jobs-added count on a successful last run', () => {
    const ran = {
      ...source,
      last_run_at: '2026-06-22T09:00:00Z',
      last_run_status: 'success' as const,
      last_run_jobs_added: 4,
    }
    render(<SourceCard source={ran} />, { wrapper: makeWrapper() })
    expect(screen.getByText(/4 vagas novas/)).toBeInTheDocument()
  })

  it('shows "falhou" with the error as a title on a failed last run', () => {
    const failed = {
      ...source,
      last_run_at: '2026-06-22T09:00:00Z',
      last_run_status: 'error' as const,
      last_run_error: 'render timeout',
    }
    render(<SourceCard source={failed} />, { wrapper: makeWrapper() })
    const line = screen.getByText(/falhou/)
    expect(line).toHaveAttribute('title', 'render timeout')
  })

  it('shows the edit/delete buttons for a legacy source with no owner', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument()
  })

  it('shows the edit/delete buttons when the current user created the source', async () => {
    __setSupabaseSession({ user: { id: 'u1', email: 'me@example.com' }, access_token: 'x' })
    const owned = { ...source, created_by: 'u1', created_by_email: 'me@example.com' }
    render(<SourceCard source={owned} />, { wrapper: makeWrapper() })
    await waitFor(() => expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument())
    expect(screen.getByText('adicionado por me@example.com')).toBeInTheDocument()
  })

  it('hides the edit/delete buttons when another user created the source', async () => {
    __setSupabaseSession({ user: { id: 'u1', email: 'me@example.com' }, access_token: 'x' })
    const owned = { ...source, created_by: 'u2', created_by_email: 'amigo@example.com' }
    render(<SourceCard source={owned} />, { wrapper: makeWrapper() })
    await waitFor(() =>
      expect(screen.getByText('adicionado por amigo@example.com')).toBeInTheDocument()
    )
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument()
  })
})
