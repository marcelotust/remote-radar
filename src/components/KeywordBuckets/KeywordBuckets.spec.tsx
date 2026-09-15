import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KeywordBuckets } from './KeywordBuckets'
import { parseTerms } from '../../utils/keywords'
import { SCORING_CONFIG_KEY } from '../../hooks/useScoringConfig'
import { AuthProvider } from '../../contexts/AuthContext'
import { __setSupabaseSession } from '../../lib/__mocks__/supabase'
import type { ScoringConfig } from '../../types'

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }))

vi.mock('../../hooks/useScoringConfigMutations', () => ({
  useReplaceScoringKeywords: () => ({ mutate: replaceMock }),
}))

const config: ScoringConfig = {
  keywords: [
    { term: 'react', weight: 2, is_veto: false },
    { term: 'css', weight: 1, is_veto: false },
    { term: 'wordpress', weight: -1, is_veto: false },
    { term: 'presencial', weight: 0, is_veto: true },
  ],
  highThreshold: 4,
  mediumThreshold: 1,
}

const renderBuckets = (cfg: ScoringConfig = config) => {
  __setSupabaseSession({ user: { id: 'u1', email: 'marcelotust@gmail.com' }, access_token: 'x' })
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  })
  qc.setQueryData(SCORING_CONFIG_KEY, cfg)
  render(
    <AuthProvider>
      <QueryClientProvider client={qc}>
        <KeywordBuckets />
      </QueryClientProvider>
    </AuthProvider>
  )
}

describe('parseTerms', () => {
  it('splits, trims, lowercases, drops blanks and dedupes', () => {
    expect(parseTerms(' React, css ,, REACT,  ')).toEqual(['react', 'css'])
  })
})

describe('KeywordBuckets', () => {
  beforeEach(() => replaceMock.mockReset())

  it('pre-fills each textarea from the config', () => {
    renderBuckets()
    expect((screen.getByLabelText(/positivo forte/i) as HTMLTextAreaElement).value).toBe('react')
    expect((screen.getByLabelText(/positivo fraco/i) as HTMLTextAreaElement).value).toBe('css')
    expect((screen.getByLabelText(/negativo/i) as HTMLTextAreaElement).value).toBe('wordpress')
    expect((screen.getByLabelText(/veto/i) as HTMLTextAreaElement).value).toBe('presencial')
  })

  it('saves the parsed full set with the right weights and veto flags', async () => {
    renderBuckets()
    const strong = screen.getByLabelText(/positivo forte/i)
    await userEvent.clear(strong)
    await userEvent.type(strong, 'react, vue')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    expect(replaceMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith(
      [
        { term: 'presencial', weight: 0, is_veto: true },
        { term: 'react', weight: 2, is_veto: false },
        { term: 'vue', weight: 2, is_veto: false },
        { term: 'css', weight: 1, is_veto: false },
        { term: 'wordpress', weight: -1, is_veto: false },
      ],
      expect.anything()
    )
  })

  it('keeps unsaved edits when a background refetch returns identical config', async () => {
    __setSupabaseSession({ user: { id: 'u1', email: 'marcelotust@gmail.com' }, access_token: 'x' })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <AuthProvider>
        <QueryClientProvider client={qc}>
          <KeywordBuckets />
        </QueryClientProvider>
      </AuthProvider>
    )
    const strong = await screen.findByLabelText(/positivo forte/i)
    // Wait for the query to fully settle (auth resolves, then the fetch
    // completes) before typing, so the seeding effect isn't still re-running
    // underneath the user's keystrokes.
    await waitFor(() => expect(qc.getQueryState(SCORING_CONFIG_KEY)?.status).toBe('success'))
    await waitFor(() => expect((strong as HTMLTextAreaElement).value).toContain('react'))
    await userEvent.clear(strong)
    await userEvent.type(strong, 'react, vue')
    await qc.invalidateQueries({ queryKey: SCORING_CONFIG_KEY })
    await waitFor(() => expect((strong as HTMLTextAreaElement).value).toBe('react, vue'))
  })

  it('dedupes a term across buckets, keeping the earliest bucket', async () => {
    renderBuckets()
    const weak = screen.getByLabelText(/positivo fraco/i)
    await userEvent.clear(weak)
    await userEvent.type(weak, 'react, css') // react also lives in +2
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    const rules = replaceMock.mock.calls[0][0] as Array<{ term: string; weight: number }>
    const react = rules.filter((r) => r.term === 'react')
    expect(react).toEqual([{ term: 'react', weight: 2, is_veto: false }])
  })

  it('saves an empty set when all buckets are cleared', async () => {
    renderBuckets()
    for (const label of [/veto/i, /positivo forte/i, /positivo fraco/i, /negativo/i]) {
      await userEvent.clear(screen.getByLabelText(label))
    }
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(replaceMock).toHaveBeenCalledWith([], expect.anything())
  })

  it('shows a success message after saving', async () => {
    replaceMock.mockImplementation((_rules, opts) => opts?.onSuccess?.())
    renderBuckets()
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(await screen.findByText(/palavras salvas/i)).toBeInTheDocument()
  })

  it('shows an error message when saving fails', async () => {
    replaceMock.mockImplementation((_rules, opts) => opts?.onError?.())
    renderBuckets()
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(await screen.findByText(/erro ao salvar/i)).toBeInTheDocument()
  })

  it('disables the button while a save is in flight', async () => {
    // default mock resolves nothing, so the component stays in the saving state
    renderBuckets()
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled()
  })

  it('clears the success message once the user edits again', async () => {
    replaceMock.mockImplementation((_rules, opts) => opts?.onSuccess?.())
    renderBuckets()
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(await screen.findByText(/palavras salvas/i)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/positivo forte/i), 'x')
    expect(screen.queryByText(/palavras salvas/i)).not.toBeInTheDocument()
  })
})
