import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { StatusDropdown } from './StatusDropdown'

describe('StatusDropdown', () => {
  it('renders the current status as the combobox label', () => {
    render(<StatusDropdown value="applied" onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: /status da vaga/i })).toHaveTextContent(
      'Candidatado'
    )
  })

  it('calls onChange with new value when an option is chosen', async () => {
    const onChange = vi.fn()
    render(<StatusDropdown value="none" onChange={onChange} />)
    await userEvent.click(screen.getByRole('combobox', { name: /status da vaga/i }))
    await userEvent.click(screen.getByRole('option', { name: /candidatado/i }))
    expect(onChange).toHaveBeenCalledWith('applied')
  })

  it('has an accessible label "Status da vaga"', () => {
    render(<StatusDropdown value="none" onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: /status da vaga/i })).toBeInTheDocument()
  })

  it('renders the status options (none, applied, dismissed) when opened', async () => {
    render(<StatusDropdown value="none" onChange={() => {}} />)
    await userEvent.click(screen.getByRole('combobox', { name: /status da vaga/i }))
    expect(screen.getByRole('option', { name: /sem status/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /candidatado/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /descartado/i })).toBeInTheDocument()
  })
})
