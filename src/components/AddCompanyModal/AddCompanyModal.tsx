import { useState, useEffect } from 'react'
import { useUIContext } from '../../contexts/UIContext'
import { useAddCompany, useEditCompany } from '../../hooks/useCompanyMutations'
import type { RemoteBrazilStatus } from '../../types'

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
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md">
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
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Website
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Notas
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm resize-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Contrata remote do Brasil?
            <select
              value={remoteBrazil}
              onChange={(e) => setRemoteBrazil(e.target.value as RemoteBrazilStatus)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="unknown">Não confirmado</option>
              <option value="yes">Sim</option>
              <option value="no">Não</option>
            </select>
          </label>
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cancelar"
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
            >
              {editingCompany ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
