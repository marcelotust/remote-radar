import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../contexts/UIContext'
import { DashboardPage } from './DashboardPage'
import userEvent from '@testing-library/user-event'
import { supabase } from '../lib/supabase'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <UIProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </UIProvider>
    </QueryClientProvider>
  )
}

describe('DashboardPage', () => {
  it('renders NavBar', () => {
    render(<DashboardPage />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
  })

  it('renders FilterBar', () => {
    render(<DashboardPage />, { wrapper: makeWrapper() })
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('renders job cards from mock data', async () => {
    render(<DashboardPage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    })
  })

  it('does not show pagination controls when there is a single page', async () => {
    render(<DashboardPage />, { wrapper: makeWrapper() })
    await waitFor(() => expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /próxima/i })).not.toBeInTheDocument()
  })

  it('paginates and resets to page 1 when a filter changes', async () => {
    // seed > 50 jobs so there are 2 pages (3 mock jobs already exist)
    for (let i = 0; i < 60; i++) {
      await supabase.from('jobs').insert({
        title: `Seeded Role ${i}`,
        company: 'Seed Co',
        url: `https://seed/${i}`,
        location: null,
        description: null,
        posted_at: null,
        scraped_at: '2026-06-01T00:00:00Z',
        status: 'none',
        read: false,
        source_url: null,
      })
    }
    render(<DashboardPage />, { wrapper: makeWrapper() })
    await waitFor(() => expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /próxima/i }))
    expect(screen.getByText(/Página 2 de 2/)).toBeInTheDocument()

    // change a filter → page resets to 1
    await userEvent.click(screen.getByLabelText(/não lidas/i))
    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled()
  })

  it('opens a job detail and marks it read when a row is selected', async () => {
    render(<DashboardPage />, { wrapper: makeWrapper() })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /senior frontend engineer/i })).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: /senior frontend engineer/i }))
    // detail panel appears and the job is now read (toggle flips to "marcar como não lida")
    await waitFor(() =>
      expect(
        screen.getAllByRole('button', { name: /marcar como não lida/i }).length
      ).toBeGreaterThan(0)
    )
  })
})
