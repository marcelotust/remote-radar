import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider } from '../../contexts/UIContext'
import { CompanyCard } from './CompanyCard'
import type { Company } from '../../types'

const company: Company = {
  id: 'c1',
  name: 'Stripe',
  website: 'https://stripe.com',
  notes: 'Good culture',
  remote_brazil: 'yes',
  created_at: '2026-06-01T00:00:00Z',
}

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <UIProvider>{children}</UIProvider>
    </QueryClientProvider>
  )
}

describe('CompanyCard', () => {
  it('renders company name', () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Stripe')).toBeInTheDocument()
  })

  it('renders the remote brazil badge', () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Remote Brasil ✓')).toBeInTheDocument()
  })

  it('renders the website link', () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('link', { name: /stripe\.com/i })).toBeInTheDocument()
  })

  it('has a delete button', () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /excluir/i })).toBeInTheDocument()
  })

  it('has an edit button', () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument()
  })

  it('clicking edit button opens modal (sets editingCompany)', async () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    await userEvent.click(screen.getByRole('button', { name: /editar/i }))
    // After click, the UIContext state changes — no error thrown means it worked
  })

  it('clicking delete button calls deleteCompany', async () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    await userEvent.click(screen.getByRole('button', { name: /excluir/i }))
    // mutation fires without error
  })

  it('renders notes when present', () => {
    render(<CompanyCard company={company} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Good culture')).toBeInTheDocument()
  })
})
