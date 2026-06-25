import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { ScorePreview } from './ScorePreview'
import { SCORING_CONFIG_KEY } from '../../hooks/useScoringConfig'
import type { ScoringConfig } from '../../types'

const renderPreview = (config?: ScoringConfig) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (config) qc.setQueryData(SCORING_CONFIG_KEY, config)
  render(
    <QueryClientProvider client={qc}>
      <ScorePreview />
    </QueryClientProvider>
  )
}

const testConfig: ScoringConfig = {
  keywords: [
    { term: 'react', weight: 2, is_veto: false },
    { term: 'typescript', weight: 2, is_veto: false },
    { term: 'remote', weight: 2, is_veto: false },
    { term: 'presencial', weight: 0, is_veto: true },
  ],
  highThreshold: 4,
  mediumThreshold: 1,
}

describe('ScorePreview', () => {
  it('shows score 0 and Baixa for empty input', () => {
    renderPreview(testConfig)
    expect(screen.getByText('0', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Baixa')).toBeInTheDocument()
  })

  it('recomputes a high score as the user types', async () => {
    renderPreview(testConfig)
    await userEvent.type(screen.getByLabelText(/testar vaga/i), 'React TypeScript Remote')
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('Alta')).toBeInTheDocument()
  })

  it('shows Negativa when a veto keyword is present', async () => {
    renderPreview(testConfig)
    await userEvent.type(screen.getByLabelText(/testar vaga/i), 'React presencial')
    expect(screen.getByText('Negativa')).toBeInTheDocument()
  })
})
