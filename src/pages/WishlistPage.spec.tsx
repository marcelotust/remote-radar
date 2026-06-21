import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../contexts/UIContext'
import { WishlistPage } from './WishlistPage'

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

describe('WishlistPage', () => {
  it('renders NavBar', () => {
    render(<WishlistPage />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
  })

  it('renders company cards from mock data', async () => {
    render(<WishlistPage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument()
    })
  })

  it('renders source cards from mock data', async () => {
    render(<WishlistPage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Lever Jobs')).toBeInTheDocument()
    })
  })

  it('has an Add Company button', () => {
    render(<WishlistPage />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /adicionar empresa/i })).toBeInTheDocument()
  })

  it('has an Add Source button', () => {
    render(<WishlistPage />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /adicionar fonte/i })).toBeInTheDocument()
  })
})
