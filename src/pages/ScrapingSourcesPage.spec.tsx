import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../contexts/UIContext'
import { ScrapingSourcesPage } from './ScrapingSourcesPage'

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

describe('ScrapingSourcesPage', () => {
  it('renders source cards from mock data', async () => {
    render(<ScrapingSourcesPage />, { wrapper: makeWrapper() })
    await waitFor(() => {
      expect(screen.getByText('Lever Jobs')).toBeInTheDocument()
    })
  })

  it('has an Add Source button', () => {
    render(<ScrapingSourcesPage />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /adicionar fonte/i })).toBeInTheDocument()
  })
})
