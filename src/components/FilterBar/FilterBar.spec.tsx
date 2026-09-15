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

  it('renders unread only toggle', () => {
    renderFilterBar()
    expect(screen.getByLabelText(/não lidas/i)).toBeInTheDocument()
  })

  it('updates context when unread toggle changes', async () => {
    renderFilterBar()
    const checkbox = screen.getByLabelText(/não lidas/i)
    await userEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('updates context when status filter changes', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByLabelText(/status/i))
    await userEvent.click(screen.getByRole('option', { name: 'Candidatado' }))
    expect(screen.getByLabelText(/status/i)).toHaveTextContent('Candidatado')
  })

  it('updates context when relevance filter changes', async () => {
    renderFilterBar()
    await userEvent.click(screen.getByLabelText(/relevância/i))
    await userEvent.click(screen.getByRole('option', { name: 'Alta' }))
    expect(screen.getByLabelText(/relevância/i)).toHaveTextContent('Alta')
  })
})
