import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the NavBar and the Home summary at the root route', () => {
    render(<App />)
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
    expect(screen.getByText(/vagas novas no último dia/i)).toBeInTheDocument()
  })

  it('redirects unknown routes to /', () => {
    window.history.pushState({}, '', '/some-unknown-route')
    render(<App />)
    expect(screen.getByText(/vagas novas no último dia/i)).toBeInTheDocument()
  })
})
