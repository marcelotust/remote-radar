import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NetworkingButton } from './NetworkingButton'

describe('NetworkingButton', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn())
  })

  it('renders a button', () => {
    render(<NetworkingButton companyName="Stripe" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens a Google search URL in new tab when clicked', async () => {
    render(<NetworkingButton companyName="Stripe" />)
    await userEvent.click(screen.getByRole('button'))
    expect(window.open).toHaveBeenCalledWith(expect.stringMatching(/google\.com\/search/), '_blank')
  })

  it('includes company name in the URL', async () => {
    render(<NetworkingButton companyName="Cloudflare" />)
    await userEvent.click(screen.getByRole('button'))
    const url = (window.open as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(decodeURIComponent(url)).toContain('"Cloudflare"')
  })
})
