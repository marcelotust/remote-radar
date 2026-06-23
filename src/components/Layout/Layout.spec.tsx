import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { Layout } from './Layout'

describe('Layout', () => {
  it('renders the NavBar and the routed child via Outlet', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<p>child content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
    expect(screen.getByText('child content')).toBeInTheDocument()
  })
})
