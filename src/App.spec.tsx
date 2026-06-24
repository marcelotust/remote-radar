import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from './contexts/UIContext'
import { Layout } from './components/Layout/Layout'
import { HomePage } from './pages/HomePage'
import { CompaniesPage } from './pages/CompaniesPage'
import { App } from './App'

describe('App', () => {
  it('renders the NavBar and the Home summary at the root route', () => {
    render(<App />)
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
    expect(screen.getByText(/vagas novas no último dia/i)).toBeInTheDocument()
  })

  it('redirects /wishlist to /companies', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <UIProvider>
          <MemoryRouter initialEntries={['/wishlist']}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/companies" element={<CompaniesPage />} />
                <Route path="/wishlist" element={<Navigate to="/companies" replace />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </UIProvider>
      </QueryClientProvider>
    )
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /adicionar empresa/i })).toBeInTheDocument()
    )
  })
})
