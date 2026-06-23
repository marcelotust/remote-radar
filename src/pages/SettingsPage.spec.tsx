import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SettingsPage } from './SettingsPage'

describe('SettingsPage', () => {
  it('renders the score and theme sections', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('heading', { name: /cálculo de score/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /tema/i })).toBeInTheDocument()
  })

  it('shows an inert theme selector with three options', () => {
    render(<SettingsPage />)
    expect(screen.getByLabelText(/claro/i)).toBeDisabled()
    expect(screen.getByLabelText(/escuro/i)).toBeDisabled()
    expect(screen.getByLabelText(/sistema/i)).toBeDisabled()
  })
})
