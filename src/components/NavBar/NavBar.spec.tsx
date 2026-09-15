import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { NavBar } from './NavBar'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'
import { __setSupabaseSession } from '../../lib/__mocks__/supabase'

const SessionProbe = () => {
  const { session } = useAuth()
  return <p>probe: {session ? 'active' : 'none'}</p>
}

const renderAt = (path: string) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <NavBar />
      </MemoryRouter>
      <SessionProbe />
    </AuthProvider>
  )

describe('NavBar', () => {
  it('renders all five navigation links', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: 'Início' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Caixa' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Empresas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fontes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ajustes' })).toBeInTheDocument()
  })

  it('marks the active link with the brand-green class', () => {
    renderAt('/companies')
    expect(screen.getByRole('link', { name: 'Empresas' }).className).toContain('text-brand-green')
    expect(screen.getByRole('link', { name: 'Início' }).className).not.toContain('text-brand-green')
  })

  it('marks Início active only on the exact root path', () => {
    renderAt('/inbox')
    expect(screen.getByRole('link', { name: 'Início' }).className).not.toContain('text-brand-green')
    expect(screen.getByRole('link', { name: 'Caixa' }).className).toContain('text-brand-green')
  })

  it('signs out when the Sair button is clicked', async () => {
    __setSupabaseSession({ user: { id: 'u1', email: 'amigo@example.com' }, access_token: 'x' })
    const user = userEvent.setup()
    renderAt('/')
    await waitFor(() => expect(screen.getByText('probe: active')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /sair/i }))

    await waitFor(() => expect(screen.getByText('probe: none')).toBeInTheDocument())
  })
})
