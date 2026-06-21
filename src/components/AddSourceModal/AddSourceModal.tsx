import { useState, useEffect } from 'react'
import { useUIContext } from '../../contexts/UIContext'
import { useAddSource, useEditSource } from '../../hooks/useSourceMutations'

export const AddSourceModal = () => {
  const { sourceModalOpen, setSourceModalOpen, editingSource, setEditingSource } = useUIContext()
  const { mutate: addSource } = useAddSource()
  const { mutate: editSource } = useEditSource()

  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (editingSource) {
      setLabel(editingSource.label)
      setUrl(editingSource.url)
    } else {
      setLabel('')
      setUrl('')
    }
  }, [editingSource])

  const handleClose = () => {
    setSourceModalOpen(false)
    setEditingSource(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingSource) {
      editSource({ ...editingSource, label, url })
    } else {
      addSource({ label, url, is_active: true })
    }
    handleClose()
  }

  if (!sourceModalOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-white font-semibold text-lg mb-4">
          {editingSource ? 'Editar Fonte' : 'Adicionar Fonte'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Label *
            <input
              aria-label="Label"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            URL *
            <input
              aria-label="URL"
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 text-sm"
            />
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
              {editingSource ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
