import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { HomePage } from './HomePage'
import { supabase } from '../lib/supabase'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('HomePage', () => {
  it('shows the summary labels and highlights with a link to the inbox', async () => {
    render(<HomePage />, { wrapper: makeWrapper() })
    expect(screen.getByText(/vagas novas no último dia/i)).toBeInTheDocument()
    expect(screen.getByText(/vagas não lidas/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /ver inbox/i })).toHaveAttribute('href', '/inbox')
  })

  it('excludes dismissed jobs from the highlights even when they score high', async () => {
    // High positive-keyword title (react/typescript/frontend/remote) so it would
    // otherwise rank into the top-5 — but it is dismissed and must not appear.
    await supabase.from('jobs').insert({
      title: 'Dismissed React TypeScript Frontend Remote Role',
      company: 'Dismissed Co',
      url: 'https://dismissed/1',
      location: null,
      description: null,
      posted_at: null,
      scraped_at: '2026-06-20T06:00:00Z',
      status: 'dismissed',
      read: false,
      source_url: null,
    })
    render(<HomePage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    })
    expect(
      screen.queryByText('Dismissed React TypeScript Frontend Remote Role')
    ).not.toBeInTheDocument()
  })

  it('counts a job scraped within the last 24h', async () => {
    await supabase.from('jobs').insert({
      title: 'Fresh Role',
      company: 'Fresh Co',
      url: 'https://fresh/1',
      location: null,
      description: null,
      posted_at: null,
      scraped_at: new Date().toISOString(),
      status: 'none',
      read: false,
      source_url: null,
    })
    render(<HomePage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      const card = screen.getByText(/vagas novas no último dia/i).closest('div') as HTMLElement
      expect(Number(card.querySelector('p')?.textContent)).toBeGreaterThanOrEqual(1)
    })
  })
})
