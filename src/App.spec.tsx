import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { App } from './App'
import { __setSupabaseSession } from './lib/__mocks__/supabase'

const signIn = () =>
  __setSupabaseSession({ user: { id: 'u1', email: 'marcelotust@gmail.com' }, access_token: 'x' })

describe('App', () => {
  it('renders the NavBar and the Home summary at the root route when signed in', async () => {
    signIn()
    render(<App />)
    await waitFor(() => expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument())
    expect(screen.getByText(/vagas novas no último dia/i)).toBeInTheDocument()
  })

  it('redirects unauthenticated visitors to /login', async () => {
    render(<App />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /enviar link/i })).toBeInTheDocument()
    )
  })

  it('redirects unknown routes to /', async () => {
    signIn()
    window.history.pushState({}, '', '/some-unknown-route')
    render(<App />)
    await waitFor(() => expect(screen.getByText(/vagas novas no último dia/i)).toBeInTheDocument())
  })
})
