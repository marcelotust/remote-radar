import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { JobRow } from './JobRow'
import type { Job } from '../../types'

const baseJob: Job = {
  id: 'j1',
  title: 'Senior Frontend Engineer',
  company: 'Stripe',
  url: 'https://stripe.com/jobs/1',
  location: 'Remote',
  description: 'desc',
  posted_at: null,
  scraped_at: '2026-06-20T06:00:00Z',
  status: 'none',
  read: false,
  source_url: null,
  relevance_score: 3,
  relevance_level: 'high',
}

describe('JobRow', () => {
  it('renders the title and company', () => {
    render(<JobRow job={baseJob} selected={false} onSelect={() => {}} />)
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument()
    expect(screen.getByText('Stripe')).toBeInTheDocument()
  })

  it('calls onSelect with the job when clicked', async () => {
    const onSelect = vi.fn()
    render(<JobRow job={baseJob} selected={false} onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /senior frontend engineer/i }))
    expect(onSelect).toHaveBeenCalledWith(baseJob)
  })

  it('shows the unread dot when the job is unread', () => {
    const { container } = render(<JobRow job={baseJob} selected={false} onSelect={() => {}} />)
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1)
  })

  it('hides the unread dot when the job is read', () => {
    const { container } = render(
      <JobRow job={{ ...baseJob, read: true }} selected={false} onSelect={() => {}} />
    )
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })

  it('dims the title text when the job is read', () => {
    render(<JobRow job={{ ...baseJob, read: true }} selected={false} onSelect={() => {}} />)
    expect(screen.getByText('Senior Frontend Engineer')).toHaveClass('text-gray-500')
  })
})
