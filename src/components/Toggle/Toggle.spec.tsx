import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Toggle } from './Toggle'

describe('Toggle', () => {
  it('renders as an accessible checkbox labelled by its text', () => {
    render(<Toggle id="t" label="Não lidas" checked={false} onChange={() => {}} />)
    expect(screen.getByLabelText(/não lidas/i)).toBeInTheDocument()
  })

  it('reflects the checked state', () => {
    render(<Toggle id="t" label="Wishlist" checked onChange={() => {}} />)
    expect(screen.getByLabelText(/wishlist/i)).toBeChecked()
  })

  it('calls onChange with the next value when clicked', async () => {
    const onChange = vi.fn()
    render(<Toggle id="t" label="Wishlist" checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText(/wishlist/i))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
