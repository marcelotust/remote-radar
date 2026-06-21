import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../contexts/UIContext'
import { DashboardPage } from './DashboardPage'

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
})
