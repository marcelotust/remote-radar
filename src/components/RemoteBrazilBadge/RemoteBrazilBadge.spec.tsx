import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RemoteBrazilBadge } from './RemoteBrazilBadge'

describe('RemoteBrazilBadge', () => {
  it('shows green badge for "yes"', () => {
    render(<RemoteBrazilBadge status="yes" />)
    expect(screen.getByText('Remote Brasil ✓')).toBeInTheDocument()
  })

  it('shows gray badge for "unknown"', () => {
    render(<RemoteBrazilBadge status="unknown" />)
    expect(screen.getByText('Não confirmado')).toBeInTheDocument()
  })

  it('shows red badge for "no"', () => {
    render(<RemoteBrazilBadge status="no" />)
    expect(screen.getByText('Não contrata remoto')).toBeInTheDocument()
  })
})
