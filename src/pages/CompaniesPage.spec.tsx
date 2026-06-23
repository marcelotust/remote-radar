import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../contexts/UIContext'
import { CompaniesPage } from './CompaniesPage'

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

describe('CompaniesPage', () => {
  it('renders company cards from mock data', async () => {
    render(<CompaniesPage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument()
    })
  })

  it('has an Add Company button', () => {
    render(<CompaniesPage />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /adicionar empresa/i })).toBeInTheDocument()
  })
})
