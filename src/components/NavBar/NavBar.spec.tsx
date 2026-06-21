import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { NavBar } from './NavBar'

const renderNavBar = (initialEntries = ['/']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <NavBar />
    </MemoryRouter>
  )

describe('NavBar', () => {
  it('renders the app name', () => {
    renderNavBar()
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
  })

  it('has a link to the dashboard', () => {
    renderNavBar()
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/')
  })

  it('has a link to wishlist', () => {
    renderNavBar()
    expect(screen.getByRole('link', { name: /wishlist/i })).toHaveAttribute('href', '/wishlist')
  })

  it('Dashboard link is active on /', () => {
    renderNavBar(['/'])
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('aria-current', 'page')
  })

  it('Dashboard link is NOT active when on /wishlist', () => {
    renderNavBar(['/wishlist'])
    expect(screen.getByRole('link', { name: /dashboard/i })).not.toHaveAttribute(
      'aria-current',
      'page'
    )
  })
})
