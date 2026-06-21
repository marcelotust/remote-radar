import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StatusDropdown } from './StatusDropdown'

describe('StatusDropdown', () => {
  it('renders the current status as selected value', () => {
    render(<StatusDropdown value="applied" onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveValue('applied')
  })

  it('calls onChange with new value when selection changes', async () => {
    const onChange = vi.fn()
    render(<StatusDropdown value="unseen" onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'seen')
    expect(onChange).toHaveBeenCalledWith('seen')
  })

  it('renders all four status options', () => {
    render(<StatusDropdown value="unseen" onChange={() => {}} />)
    expect(screen.getByRole('option', { name: /não visto/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^visto$/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /candidatado/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /descartado/i })).toBeInTheDocument()
  })
})
