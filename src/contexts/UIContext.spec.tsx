import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { UIProvider, useUIContext } from './UIContext'

const TestConsumer = () => {
  const { filters, setFilters, companyModalOpen, setCompanyModalOpen } = useUIContext()
  return (
    <div>
      <span data-testid="status">{filters.status}</span>
      <span data-testid="modal">{String(companyModalOpen)}</span>
      <button onClick={() => setFilters({ status: 'applied' })}>set-status</button>
      <button onClick={() => setCompanyModalOpen(true)}>open-modal</button>
    </div>
  )
}

describe('UIContext', () => {
  it('provides default filter values', () => {
    render(
      <UIProvider>
        <TestConsumer />
      </UIProvider>
    )
    expect(screen.getByTestId('status').textContent).toBe('all')
  })

  it('updates filter state', async () => {
    render(
      <UIProvider>
        <TestConsumer />
      </UIProvider>
    )
    await userEvent.click(screen.getByText('set-status'))
    expect(screen.getByTestId('status').textContent).toBe('applied')
  })

  it('opens company modal', async () => {
    render(
      <UIProvider>
        <TestConsumer />
      </UIProvider>
    )
    expect(screen.getByTestId('modal').textContent).toBe('false')
    await userEvent.click(screen.getByText('open-modal'))
    expect(screen.getByTestId('modal').textContent).toBe('true')
  })

  it('throws when useUIContext is used outside UIProvider', () => {
    const consoleError = console.error
    console.error = () => {}
    expect(() => render(<TestConsumer />)).toThrow('useUIContext must be used within UIProvider')
    console.error = consoleError
  })
})
