import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { RequireAuth } from './RequireAuth'
import { AuthProvider } from '../../contexts/AuthContext'
import { __setSupabaseSession } from '../../lib/__mocks__/supabase'

const renderAt = (path: string) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<p>protected content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )

describe('RequireAuth', () => {
  it('redirects to /login when there is no session', async () => {
    renderAt('/')
    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument())
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('renders the protected route when a session exists', async () => {
    __setSupabaseSession({ user: { id: 'u1', email: 'amigo@example.com' }, access_token: 'x' })
    renderAt('/')
    await waitFor(() => expect(screen.getByText('protected content')).toBeInTheDocument())
  })
})
