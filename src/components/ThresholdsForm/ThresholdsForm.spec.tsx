import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThresholdsForm } from './ThresholdsForm'

const { updateMock } = vi.hoisted(() => ({ updateMock: vi.fn() }))

vi.mock('../../hooks/useScoringConfigMutations', () => ({
  useUpdateScoringSettings: () => ({ mutate: updateMock }),
}))

describe('ThresholdsForm', () => {
  beforeEach(() => updateMock.mockClear())

  it('persists a new high threshold', () => {
    render(<ThresholdsForm highThreshold={4} mediumThreshold={1} />)
    fireEvent.change(screen.getByLabelText(/limiar alta/i), { target: { value: '6' } })
    expect(updateMock).toHaveBeenCalledWith({ high_threshold: 6, medium_threshold: 1 })
  })

  it('persists a new medium threshold', () => {
    render(<ThresholdsForm highThreshold={4} mediumThreshold={1} />)
    fireEvent.change(screen.getByLabelText(/limiar média/i), { target: { value: '2' } })
    expect(updateMock).toHaveBeenCalledWith({ high_threshold: 4, medium_threshold: 2 })
  })

  it('clamps high up so medium never exceeds high', () => {
    render(<ThresholdsForm highThreshold={4} mediumThreshold={1} />)
    fireEvent.change(screen.getByLabelText(/limiar média/i), { target: { value: '9' } })
    expect(updateMock).toHaveBeenCalledWith({ high_threshold: 9, medium_threshold: 9 })
  })

  it('clamps medium down so it never exceeds high', () => {
    render(<ThresholdsForm highThreshold={4} mediumThreshold={3} />)
    fireEvent.change(screen.getByLabelText(/limiar alta/i), { target: { value: '2' } })
    expect(updateMock).toHaveBeenCalledWith({ high_threshold: 2, medium_threshold: 2 })
  })
})
