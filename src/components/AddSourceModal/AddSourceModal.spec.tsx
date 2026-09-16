import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import { UIProvider, useUIContext } from '../../contexts/UIContext'
import { AuthProvider } from '../../contexts/AuthContext'
import { AddSourceModal } from './AddSourceModal'
import type { ScrapingSource } from '../../types'

const makeWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <QueryClientProvider client={qc}>
        <UIProvider>{children}</UIProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

const OpenTrigger = () => {
  const { setSourceModalOpen } = useUIContext()
  return <button onClick={() => setSourceModalOpen(true)}>open</button>
}

const EditTrigger = ({ source }: { source: ScrapingSource }) => {
  const { setSourceModalOpen, setEditingSource } = useUIContext()
  return (
    <button
      onClick={() => {
        setEditingSource(source)
        setSourceModalOpen(true)
      }}
    >
      edit
    </button>
  )
}

const existingSource: ScrapingSource = {
  id: 's1',
  label: 'Lever Jobs',
  url: 'https://jobs.lever.co',
  is_active: true,
  created_at: '2026-06-01T00:00:00Z',
}

const classifiedSource: ScrapingSource = {
  ...existingSource,
  id: 's2',
  company_type: 'startup',
}

const renderModal = () => {
  const wrapper = makeWrapper()
  render(
    <>
      <OpenTrigger />
      <AddSourceModal />
    </>,
    { wrapper }
  )
}

describe('AddSourceModal', () => {
  it('is not visible when closed', () => {
    renderModal()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is visible when open', async () => {
    renderModal()
    await userEvent.click(screen.getByText('open'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has label, URL, and company-type inputs', async () => {
    renderModal()
    await userEvent.click(screen.getByText('open'))
    expect(screen.getByLabelText(/label/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/url/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tipo de empresa/i)).toHaveValue('')
  })

  it('submits with a selected company_type and closes the modal', async () => {
    const wrapper = makeWrapper()
    render(
      <>
        <OpenTrigger />
        <AddSourceModal />
      </>,
      { wrapper }
    )
    await userEvent.click(screen.getByText('open'))
    await userEvent.type(screen.getByLabelText(/label/i), 'New Source')
    await userEvent.type(screen.getByLabelText(/url/i), 'https://example.com')
    await userEvent.selectOptions(screen.getByLabelText(/tipo de empresa/i), 'startup')
    await userEvent.click(screen.getByRole('button', { name: /adicionar/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('prefills company_type when editing a classified source', async () => {
    const wrapper = makeWrapper()
    render(
      <>
        <EditTrigger source={classifiedSource} />
        <AddSourceModal />
      </>,
      { wrapper }
    )
    await userEvent.click(screen.getByText('edit'))
    expect(screen.getByLabelText(/tipo de empresa/i)).toHaveValue('startup')
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
        <AddSourceModal />
      </>,
      { wrapper }
    )
    await userEvent.click(screen.getByText('open'))
    await userEvent.type(screen.getByLabelText(/label/i), 'New Source')
    await userEvent.type(screen.getByLabelText(/url/i), 'https://example.com')
    await userEvent.click(screen.getByRole('button', { name: /adicionar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows edit title when editingSource is set', async () => {
    const wrapper = makeWrapper()
    render(
      <>
        <EditTrigger source={existingSource} />
        <AddSourceModal />
      </>,
      { wrapper }
    )
    await userEvent.click(screen.getByText('edit'))
    expect(screen.getByText('Editar Fonte')).toBeInTheDocument()
  })

  it('prefills label when editing', async () => {
    const wrapper = makeWrapper()
    render(
      <>
        <EditTrigger source={existingSource} />
        <AddSourceModal />
      </>,
      { wrapper }
    )
    await userEvent.click(screen.getByText('edit'))
    expect(screen.getByLabelText(/label/i)).toHaveValue('Lever Jobs')
  })

  it('submits in edit mode and closes modal', async () => {
    const wrapper = makeWrapper()
    render(
      <>
        <EditTrigger source={existingSource} />
        <AddSourceModal />
      </>,
      { wrapper }
    )
    await userEvent.click(screen.getByText('edit'))
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
