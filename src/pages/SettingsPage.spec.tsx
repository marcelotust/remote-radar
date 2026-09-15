import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { SettingsPage } from './SettingsPage'
import { AuthProvider } from '../contexts/AuthContext'
import { __setSupabaseSession } from '../lib/__mocks__/supabase'

const renderPage = () => {
  __setSupabaseSession({ user: { id: 'u1', email: 'marcelotust@gmail.com' }, access_token: 'x' })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <AuthProvider>
      <QueryClientProvider client={qc}>
        <SettingsPage />
      </QueryClientProvider>
    </AuthProvider>
  )
}

describe('SettingsPage', () => {
  it('renders the score and theme sections', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /cálculo de score/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /tema/i })).toBeInTheDocument()
  })

  it('renders the interactive score editor', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByLabelText(/veto/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/testar vaga/i)).toBeInTheDocument()
    })
  })

  it('shows an inert theme selector with three options', () => {
    renderPage()
    expect(screen.getByLabelText(/claro/i)).toBeDisabled()
    expect(screen.getByLabelText(/escuro/i)).toBeDisabled()
    expect(screen.getByLabelText(/sistema/i)).toBeDisabled()
  })
})
