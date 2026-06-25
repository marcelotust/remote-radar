import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddKeywordModal } from './AddKeywordModal'

const { addMock } = vi.hoisted(() => ({ addMock: vi.fn() }))

vi.mock('../../hooks/useScoringConfigMutations', () => ({
  useAddScoringKeyword: () => ({ mutate: addMock }),
}))

describe('AddKeywordModal', () => {
  beforeEach(() => addMock.mockClear())

  it('is not rendered when closed', () => {
    render(<AddKeywordModal open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('adds a scored keyword with the entered term and weight', async () => {
    render(<AddKeywordModal open onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/palavra-chave/i), 'svelte')
    const weight = screen.getByLabelText(/peso/i)
    await userEvent.clear(weight)
    await userEvent.type(weight, '2')
    await userEvent.click(screen.getByRole('button', { name: /adicionar/i }))
    expect(addMock).toHaveBeenCalledWith({ term: 'svelte', weight: 2, is_veto: false })
  })

  it('hides the weight field and writes weight 0 when veto is on', async () => {
    render(<AddKeywordModal open onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/palavra-chave/i), 'cobol')
    await userEvent.click(screen.getByLabelText(/veto/i))
    expect(screen.queryByLabelText(/peso/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /adicionar/i }))
    expect(addMock).toHaveBeenCalledWith({ term: 'cobol', weight: 0, is_veto: true })
  })

  it('calls onClose on cancel', async () => {
    const onClose = vi.fn()
    render(<AddKeywordModal open onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
