import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { KeywordList } from './KeywordList'
import type { ScoringKeyword } from '../../types'

const kw = (over: Partial<ScoringKeyword>): ScoringKeyword => ({
  id: over.term ?? 'k',
  user_id: null,
  term: 'x',
  weight: 0,
  is_veto: false,
  created_at: '',
  ...over,
})

const keywords: ScoringKeyword[] = [
  kw({ term: 'node', weight: 1 }),
  kw({ term: 'react', weight: 2 }),
  kw({ term: 'presencial', is_veto: true }),
]

const renderList = (onAdd = vi.fn()) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <KeywordList keywords={keywords} onAdd={onAdd} />
    </QueryClientProvider>
  )
  return onAdd
}

describe('KeywordList', () => {
  it('renders Vetos and Pontuação group headings', () => {
    renderList()
    expect(screen.getByRole('heading', { name: /vetos/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /pontuação/i })).toBeInTheDocument()
  })

  it('orders scored keywords by weight descending', () => {
    renderList()
    const terms = screen.getAllByText(/^(react|node)$/).map((el) => el.textContent)
    expect(terms).toEqual(['react', 'node'])
  })

  it('shows the veto keyword under Vetos', () => {
    renderList()
    expect(screen.getByText('presencial')).toBeInTheDocument()
  })

  it('invokes onAdd when the add button is clicked', async () => {
    const onAdd = renderList()
    await userEvent.click(screen.getByRole('button', { name: /adicionar palavra/i }))
    expect(onAdd).toHaveBeenCalled()
  })
})
