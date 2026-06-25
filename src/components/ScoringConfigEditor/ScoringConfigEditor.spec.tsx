import { render, screen, waitFor } from '@testing-library/react'
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
  it('renders thresholds, keyword buckets, and the preview', async () => {
    renderEditor()
    await waitFor(() => expect(screen.getByLabelText(/limiar alta/i)).toHaveValue(4))
    const strong = screen.getByLabelText(/positivo forte/i) as HTMLTextAreaElement
    expect(strong.value).toContain('react')
    expect(screen.getByLabelText(/testar vaga/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument()
  })
})
