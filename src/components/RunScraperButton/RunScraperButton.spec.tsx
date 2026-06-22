import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { RunScraperButton } from './RunScraperButton'

afterEach(() => vi.unstubAllEnvs())

describe('RunScraperButton', () => {
  it('renders an external link to the workflow when configured', () => {
    vi.stubEnv(
      'VITE_GITHUB_WORKFLOW_URL',
      'https://github.com/x/actions/workflows/daily-scraper.yml'
    )
    render(<RunScraperButton />)
    const link = screen.getByRole('link', { name: /run scraper/i })
    expect(link).toHaveAttribute('href', 'https://github.com/x/actions/workflows/daily-scraper.yml')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders nothing when the workflow URL is not configured', () => {
    vi.stubEnv('VITE_GITHUB_WORKFLOW_URL', '')
    const { container } = render(<RunScraperButton />)
    expect(container).toBeEmptyDOMElement()
  })
})
