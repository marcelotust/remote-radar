import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { AuthProvider } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
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
  it('does not offer email/magic-link sign-in', () => {
    renderPage()

    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enviar link/i })).not.toBeInTheDocument()
  })

  it('redirects to / when a session already exists', async () => {
    __setSupabaseSession({ user: { id: 'u1', email: 'amigo@example.com' }, access_token: 'x' })
    renderPage()
    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument())
  })

  it('starts Google sign-in with redirectTo pointing at the current origin', async () => {
    const spy = vi.spyOn(supabase.auth, 'signInWithOAuth')
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /continuar com google/i }))

    expect(spy).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  })

  it('shows the not-allowed message when returning from Google with the allowlist hook rejection', async () => {
    window.location.hash =
      '#error=server_error&error_description=Esse%20e-mail%20ainda%20n%C3%A3o%20foi%20liberado.%20Pe%C3%A7a%20para%20o%20administrador%20te%20adicionar.'

    renderPage()

    await waitFor(() => expect(screen.getByText(/ainda não foi liberado/i)).toBeInTheDocument())
    expect(window.location.hash).toBe('')
  })

  it('shows a generic error for other OAuth failures returning from Google', async () => {
    window.location.hash = '#error=access_denied&error_description=The+user+denied+the+request'

    renderPage()

    await waitFor(() =>
      expect(screen.getByText(/não foi possível entrar agora/i)).toBeInTheDocument()
    )
    expect(window.location.hash).toBe('')
  })
})
