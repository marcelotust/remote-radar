import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScoreBadge } from './ScoreBadge'

describe('ScoreBadge', () => {
  it('shows "Alta" for high level', () => {
    render(<ScoreBadge level="high" />)
    expect(screen.getByText('Alta')).toBeInTheDocument()
  })

  it('shows "Média" for medium level', () => {
    render(<ScoreBadge level="medium" />)
    expect(screen.getByText('Média')).toBeInTheDocument()
  })

  it('shows "Baixa" for low level', () => {
    render(<ScoreBadge level="low" />)
    expect(screen.getByText('Baixa')).toBeInTheDocument()
  })

  it('shows "Negativa" for negative level', () => {
    render(<ScoreBadge level="negative" />)
    expect(screen.getByText('Negativa')).toBeInTheDocument()
  })
})
