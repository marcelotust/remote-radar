import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { ScoringConfigEditor } from './ScoringConfigEditor'

const renderEditor = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <ScoringConfigEditor />
    </QueryClientProvider>
  )
}

describe('ScoringConfigEditor', () => {
  it('renders thresholds, a seeded keyword, and the preview', async () => {
    renderEditor()
    await waitFor(() => expect(screen.getByLabelText(/limiar alta/i)).toHaveValue(4))
    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByLabelText(/testar vaga/i)).toBeInTheDocument()
  })

  it('opens the add-keyword modal from the add button', async () => {
    renderEditor()
    await waitFor(() => expect(screen.getByText('react')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /adicionar palavra/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
