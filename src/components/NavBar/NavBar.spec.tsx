import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { NavBar } from './NavBar'

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavBar />
    </MemoryRouter>
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
})
