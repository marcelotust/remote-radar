import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Layout } from './Layout'
import { AuthProvider } from '../../contexts/AuthContext'

describe('Layout', () => {
  it('renders the NavBar and the routed child via Outlet', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<p>child content</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    )
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
    expect(screen.getByText('child content')).toBeInTheDocument()
  })
})
