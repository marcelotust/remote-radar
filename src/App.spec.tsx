import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders without crashing and shows dashboard', () => {
    render(<App />)
    expect(screen.getByText(/Remote Radar/i)).toBeInTheDocument()
  })
})
