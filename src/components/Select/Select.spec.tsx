import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Select } from './Select'

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
]

describe('Select', () => {
  it('renders the current value as the combobox label', () => {
    render(<Select value="b" onChange={() => {}} options={options} ariaLabel="Choice" />)
    expect(screen.getByRole('combobox', { name: /choice/i })).toHaveTextContent('Option B')
  })

  it('does not render the listbox until opened', () => {
    render(<Select value="a" onChange={() => {}} options={options} ariaLabel="Choice" />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens and exposes the options on click', async () => {
    render(<Select value="a" onChange={() => {}} options={options} ariaLabel="Choice" />)
    await userEvent.click(screen.getByRole('combobox', { name: /choice/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('marks the current value as the selected option', async () => {
    render(<Select value="c" onChange={() => {}} options={options} ariaLabel="Choice" />)
    await userEvent.click(screen.getByRole('combobox', { name: /choice/i }))
    expect(screen.getByRole('option', { name: 'Option C' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  it('calls onChange when an option is chosen and closes the listbox', async () => {
    const onChange = vi.fn()
    render(<Select value="a" onChange={onChange} options={options} ariaLabel="Choice" />)
    await userEvent.click(screen.getByRole('combobox', { name: /choice/i }))
    await userEvent.click(screen.getByRole('option', { name: 'Option B' }))
    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
