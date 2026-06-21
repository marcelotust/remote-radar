import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../../contexts/UIContext'
import { FilterBar } from './FilterBar'

const renderFilterBar = () =>
  render(
    <UIProvider>
      <FilterBar />
    </UIProvider>
  )

describe('FilterBar', () => {
  it('renders status filter select', () => {
    renderFilterBar()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('renders relevance filter select', () => {
    renderFilterBar()
    expect(screen.getByLabelText(/relevância/i)).toBeInTheDocument()
  })

  it('renders wishlist only toggle', () => {
    renderFilterBar()
    expect(screen.getByLabelText(/wishlist/i)).toBeInTheDocument()
  })

  it('updates context when status filter changes', async () => {
    renderFilterBar()
    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'applied')
    expect(screen.getByLabelText(/status/i)).toHaveValue('applied')
  })

  it('updates context when relevance filter changes', async () => {
    renderFilterBar()
    await userEvent.selectOptions(screen.getByLabelText(/relevância/i), 'high')
    expect(screen.getByLabelText(/relevância/i)).toHaveValue('high')
  })

  it('updates context when wishlist toggle changes', async () => {
    renderFilterBar()
    const checkbox = screen.getByLabelText(/wishlist/i)
    await userEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })
})
