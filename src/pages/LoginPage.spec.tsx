import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { LoginPage } from './LoginPage'
import { AuthProvider } from '../contexts/AuthContext'
import { __setSupabaseSession } from '../lib/__mocks__/supabase'

const renderPage = () =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>home page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )

describe('LoginPage', () => {
  it('sends the magic link when the email is on the allowlist', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/e-mail/i), 'marcelotust@gmail.com')
    await user.click(screen.getByRole('button', { name: /enviar link/i }))

    await waitFor(() => expect(screen.getByText(/verifique seu e-mail/i)).toBeInTheDocument())
  })

  it('shows a message when the email is not on the allowlist', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/e-mail/i), 'estranho@example.com')
    await user.click(screen.getByRole('button', { name: /enviar link/i }))

    await waitFor(() => expect(screen.getByText(/ainda não foi liberado/i)).toBeInTheDocument())
  })

  it('redirects to / when a session already exists', async () => {
    __setSupabaseSession({ user: { id: 'u1', email: 'amigo@example.com' }, access_token: 'x' })
    renderPage()
    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument())
  })
})
