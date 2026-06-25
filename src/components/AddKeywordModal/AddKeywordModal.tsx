import { useEffect, useState } from 'react'
import { useAddScoringKeyword } from '../../hooks/useScoringConfigMutations'
import { Toggle } from '../Toggle/Toggle'

const inputClass =
  'bg-brand-input text-white border-2 border-brand-green/20 rounded-2xl px-3 py-2 text-sm transition-all duration-300 focus:outline-none focus:border-brand-green focus:bg-brand-green/5 focus:shadow-neon-input'

interface Props {
  open: boolean
  onClose: () => void
}

export const AddKeywordModal = ({ open, onClose }: Props) => {
  const { mutate: addKeyword } = useAddScoringKeyword()
  const [term, setTerm] = useState('')
  const [weight, setWeight] = useState(1)
  const [isVeto, setIsVeto] = useState(false)

  useEffect(() => {
    if (open) {
      setTerm('')
      setWeight(1)
      setIsVeto(false)
    }
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addKeyword({ term: term.trim(), weight: isVeto ? 0 : weight, is_veto: isVeto })
    onClose()
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    >
      <div className="w-full max-w-md rounded-3xl border-2 border-brand-green/20 bg-brand-surface p-6 shadow-neon-card">
        <h2 className="mb-4 text-lg font-semibold text-white">Adicionar palavra</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-gray-400">
            Palavra-chave *
            <input
              aria-label="Palavra-chave"
              required
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className={inputClass}
            />
          </label>

          {!isVeto && (
            <label className="flex flex-col gap-1 text-sm text-gray-400">
              Peso
              <input
                type="number"
                aria-label="Peso"
                value={weight}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (!Number.isNaN(n)) setWeight(n)
                }}
                className={inputClass}
              />
            </label>
          )}

          <Toggle
            id="add-keyword-veto"
            label="Veto (vaga negativa)"
            checked={isVeto}
            onChange={setIsVeto}
          />

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Cancelar"
              className="px-4 py-2 text-sm text-gray-400 transition-all duration-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-brand-green px-5 py-2 text-sm font-medium text-black transition-all duration-300 hover:shadow-neon-active"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
