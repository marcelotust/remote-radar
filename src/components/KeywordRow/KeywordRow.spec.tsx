import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KeywordRow } from './KeywordRow'
import type { ScoringKeyword } from '../../types'

const { editMock, deleteMock } = vi.hoisted(() => ({
  editMock: vi.fn(),
  deleteMock: vi.fn(),
}))

vi.mock('../../hooks/useScoringConfigMutations', () => ({
  useEditScoringKeyword: () => ({ mutate: editMock }),
  useDeleteScoringKeyword: () => ({ mutate: deleteMock }),
}))

const keyword = (over: Partial<ScoringKeyword> = {}): ScoringKeyword => ({
  id: 'k1',
  user_id: null,
  term: 'react',
  weight: 2,
  is_veto: false,
  created_at: '2026-06-01T00:00:00Z',
  ...over,
})

describe('KeywordRow', () => {
  beforeEach(() => {
    editMock.mockClear()
    deleteMock.mockClear()
  })

  it('increments the weight on +', async () => {
    render(<KeywordRow keyword={keyword()} />)
    await userEvent.click(screen.getByLabelText(/aumentar peso de react/i))
    expect(editMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1', weight: 3 }))
  })

  it('decrements the weight on −', async () => {
    render(<KeywordRow keyword={keyword()} />)
    await userEvent.click(screen.getByLabelText(/diminuir peso de react/i))
    expect(editMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1', weight: 1 }))
  })

  it('toggles veto', async () => {
    render(<KeywordRow keyword={keyword()} />)
    await userEvent.click(screen.getByLabelText(/^veto$/i))
    expect(editMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1', is_veto: true }))
  })

  it('deletes by id', async () => {
    render(<KeywordRow keyword={keyword()} />)
    await userEvent.click(screen.getByLabelText(/excluir react/i))
    expect(deleteMock).toHaveBeenCalledWith('k1')
  })

  it('hides the weight stepper for a veto keyword', () => {
    render(<KeywordRow keyword={keyword({ is_veto: true, term: 'java' })} />)
    expect(screen.queryByLabelText(/peso de java/i)).not.toBeInTheDocument()
  })
})
