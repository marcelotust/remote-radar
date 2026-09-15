import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { __setSupabaseSession } from '../lib/__mocks__/supabase'

const Consumer = () => {
  const { session, user, loading, signOut } = useAuth()
  if (loading) return <p>loading</p>
  return (
    <div>
      <p>session: {session ? 'active' : 'none'}</p>
      <p>user: {user?.email ?? 'none'}</p>
      <button onClick={() => signOut()}>Sair</button>
    </div>
  )
}

describe('AuthProvider / useAuth', () => {
  it('starts with no session once loading resolves', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )
    await waitFor(() => expect(screen.getByText('session: none')).toBeInTheDocument())
  })

  it('reflects a session change from onAuthStateChange', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )
    await waitFor(() => expect(screen.getByText('session: none')).toBeInTheDocument())

    __setSupabaseSession({ user: { id: 'u1', email: 'amigo@example.com' }, access_token: 'x' })

    await waitFor(() => expect(screen.getByText('session: active')).toBeInTheDocument())
    expect(screen.getByText('user: amigo@example.com')).toBeInTheDocument()
  })

  it('signOut clears the session', async () => {
    __setSupabaseSession({ user: { id: 'u1', email: 'amigo@example.com' }, access_token: 'x' })
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )
    await waitFor(() => expect(screen.getByText('session: active')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(screen.getByText('session: none')).toBeInTheDocument())
  })

  it('throws when used outside AuthProvider', () => {
    const BadConsumer = () => {
      useAuth()
      return null
    }
    expect(() => render(<BadConsumer />)).toThrow(/useAuth must be used within AuthProvider/)
  })
})
