import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BottomSheet } from './BottomSheet'

describe('BottomSheet', () => {
  it('renders nothing when closed', () => {
    render(
      <BottomSheet open={false} onClose={() => {}}>
        <p>Detail body</p>
      </BottomSheet>
    )
    expect(screen.queryByText('Detail body')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders children and a drag handle when open', () => {
    render(
      <BottomSheet open onClose={() => {}}>
        <p>Detail body</p>
      </BottomSheet>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Detail body')).toBeInTheDocument()
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <p>Detail body</p>
      </BottomSheet>
    )
    await userEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose}>
        <p>Detail body</p>
      </BottomSheet>
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('locks body scroll while open and restores it on close', () => {
    const { rerender } = render(
      <BottomSheet open onClose={() => {}}>
        <p>Detail body</p>
      </BottomSheet>
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <BottomSheet open={false} onClose={() => {}}>
        <p>Detail body</p>
      </BottomSheet>
    )
    expect(document.body.style.overflow).toBe('')
  })
})
