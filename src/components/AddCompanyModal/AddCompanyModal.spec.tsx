import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider, useUIContext } from '../../contexts/UIContext'
import { AddCompanyModal } from './AddCompanyModal'
import type { Company } from '../../types'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <UIProvider>{children}</UIProvider>
    </QueryClientProvider>
  )
}

const OpenTrigger = () => {
  const { setCompanyModalOpen } = useUIContext()
  return <button onClick={() => setCompanyModalOpen(true)}>open</button>
}

const EditTrigger = ({ company }: { company: Company }) => {
  const { setCompanyModalOpen, setEditingCompany } = useUIContext()
  return (
    <button
      onClick={() => {
        setEditingCompany(company)
        setCompanyModalOpen(true)
      }}
    >
      edit
    </button>
  )
}

const existingCompany: Company = {
  id: 'c1',
  name: 'Stripe',
  website: 'https://stripe.com',
  notes: 'Good culture',
  remote_brazil: 'yes',
  created_at: '2026-06-01T00:00:00Z',
}

const renderModal = () => {
  const wrapper = makeWrapper()
  render(
    <>
      <OpenTrigger />
      <AddCompanyModal />
    </>,
    { wrapper }
  )
}

describe('AddCompanyModal', () => {
  it('is not visible when closed', () => {
    renderModal()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is visible when open', async () => {
    renderModal()
    await userEvent.click(screen.getByText('open'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has a name input field', async () => {
    renderModal()
    await userEvent.click(screen.getByText('open'))
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
  })

  it('closes when cancel is clicked', async () => {
    renderModal()
    await userEvent.click(screen.getByText('open'))
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('submits the form and closes modal (add mode)', async () => {
    const wrapper = makeWrapper()
    render(
      <>
        <OpenTrigger />
        <AddCompanyModal />
      </>,
      { wrapper }
    )
    await userEvent.click(screen.getByText('open'))
    await userEvent.type(screen.getByLabelText(/nome/i), 'New Corp')
    await userEvent.click(screen.getByRole('button', { name: /adicionar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows edit title when editingCompany is set', async () => {
    const wrapper = makeWrapper()
    render(
      <>
        <EditTrigger company={existingCompany} />
        <AddCompanyModal />
      </>,
      { wrapper }
    )
    await userEvent.click(screen.getByText('edit'))
    expect(screen.getByText('Editar Empresa')).toBeInTheDocument()
  })

  it('prefills fields when editing', async () => {
    const wrapper = makeWrapper()
    render(
      <>
        <EditTrigger company={existingCompany} />
        <AddCompanyModal />
      </>,
      { wrapper }
    )
    await userEvent.click(screen.getByText('edit'))
    expect(screen.getByLabelText(/nome/i)).toHaveValue('Stripe')
  })

  it('submits in edit mode and closes modal', async () => {
    const wrapper = makeWrapper()
    render(
      <>
        <EditTrigger company={existingCompany} />
        <AddCompanyModal />
      </>,
      { wrapper }
    )
    await userEvent.click(screen.getByText('edit'))
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
