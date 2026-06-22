import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StatusDropdown } from './StatusDropdown'

describe('StatusDropdown', () => {
  it('renders the current status as selected value', () => {
    render(<StatusDropdown value="applied" onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: /status da vaga/i })).toHaveValue('applied')
  })

  it('calls onChange with new value when selection changes', async () => {
    const onChange = vi.fn()
    render(<StatusDropdown value="none" onChange={onChange} />)
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /status da vaga/i }),
      'applied'
    )
    expect(onChange).toHaveBeenCalledWith('applied')
  })

  it('has an accessible label "Status da vaga"', () => {
    render(<StatusDropdown value="none" onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: /status da vaga/i })).toBeInTheDocument()
  })

  it('renders the status options (none, applied, dismissed)', () => {
    render(<StatusDropdown value="none" onChange={() => {}} />)
    expect(screen.getByRole('option', { name: /sem status/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /candidatado/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /descartado/i })).toBeInTheDocument()
  })
})
