import { useState, useEffect } from 'react'
import { useUIContext } from '../../contexts/UIContext'
import { useAddCompany, useEditCompany } from '../../hooks/useCompanyMutations'
import { Select } from '../Select/Select'
import type { RemoteBrazilStatus } from '../../types'

const inputClass =
  'bg-brand-input text-white border-2 border-brand-green/20 rounded-2xl px-3 py-2 text-sm transition-all duration-300 focus:outline-none focus:border-brand-green focus:bg-brand-green/5 focus:shadow-neon-input'

const REMOTE_OPTIONS: { value: RemoteBrazilStatus; label: string }[] = [
  { value: 'unknown', label: 'Não confirmado' },
  { value: 'yes', label: 'Sim' },
  { value: 'no', label: 'Não' },
]

export const AddCompanyModal = () => {
  const { companyModalOpen, setCompanyModalOpen, editingCompany, setEditingCompany } =
    useUIContext()
  const { mutate: addCompany } = useAddCompany()
  const { mutate: editCompany } = useEditCompany()

  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [notes, setNotes] = useState('')
  const [remoteBrazil, setRemoteBrazil] = useState<RemoteBrazilStatus>('unknown')

  useEffect(() => {
    if (editingCompany) {
      setName(editingCompany.name)
      setWebsite(editingCompany.website ?? '')
      setNotes(editingCompany.notes ?? '')
      setRemoteBrazil(editingCompany.remote_brazil)
    } else {
      setName('')
      setWebsite('')
      setNotes('')
      setRemoteBrazil('unknown')
    }
  }, [editingCompany])

  const handleClose = () => {
    setCompanyModalOpen(false)
    setEditingCompany(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name,
      website: website || null,
      notes: notes || null,
      remote_brazil: remoteBrazil,
    }
    if (editingCompany) {
      editCompany({ ...editingCompany, ...data })
    } else {
      addCompany(data)
    }
    handleClose()
  }

  if (!companyModalOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="bg-brand-surface border-2 border-brand-green/20 rounded-3xl p-6 w-full max-w-md shadow-neon-card">
        <h2 className="text-white font-semibold text-lg mb-4">
          {editingCompany ? 'Editar Empresa' : 'Adicionar Empresa'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Nome *
            <input
              aria-label="Nome"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Website
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Notas
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </label>
          <div className="flex flex-col gap-1 text-sm text-gray-400">
            <span id="remote-brazil-label">Contrata remote do Brasil?</span>
            <Select
              labelledBy="remote-brazil-label"
              value={remoteBrazil}
              onChange={setRemoteBrazil}
              options={REMOTE_OPTIONS}
              block
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cancelar"
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-all duration-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm bg-brand-green text-black font-medium rounded-2xl hover:shadow-neon-active transition-all duration-300"
            >
              {editingCompany ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
