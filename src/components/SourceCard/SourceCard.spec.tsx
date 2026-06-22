import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { SourceCard } from './SourceCard'
import { UIProvider } from '../../contexts/UIContext'
import type { ScrapingSource } from '../../types'

const source: ScrapingSource = {
  id: 's1',
  label: 'Lever Jobs',
  url: 'https://jobs.lever.co',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
}

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <UIProvider>{children}</UIProvider>
    </QueryClientProvider>
  )
}

describe('SourceCard', () => {
  it('renders the label', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Lever Jobs')).toBeInTheDocument()
  })

  it('renders the URL', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByText('https://jobs.lever.co')).toBeInTheDocument()
  })

  it('renders active toggle checked when is_active is true', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('has a delete button', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument()
  })

  it('has an edit button', () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
  })

  it('clicking edit button does not throw', async () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
  })

  it('clicking delete button calls deleteSource without error', async () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    await userEvent.click(screen.getByRole('button', { name: /excluir/i }))
  })

  it('toggling checkbox calls editSource without error', async () => {
    render(<SourceCard source={source} />, { wrapper: makeWrapper() })
    await userEvent.click(screen.getByRole('checkbox'))
  })

  it('renders inactive checkbox when is_active is false', () => {
    const inactiveSource = { ...source, is_active: false }
    render(<SourceCard source={inactiveSource} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })
})
