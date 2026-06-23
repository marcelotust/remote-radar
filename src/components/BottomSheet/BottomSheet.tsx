import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

/**
 * Neon Bubble mobile bottom sheet (#9). Pure React + Tailwind: slides up via a
 * translate-y transition, stays mounted through the exit animation, and closes
 * on backdrop click or Escape. Hidden on lg+ (desktop uses the split-view panel).
 */
export const BottomSheet = ({ open, onClose, children }: Props) => {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => setEntered(true))
      return () => cancelAnimationFrame(id)
    }
    setEntered(false)
    const t = setTimeout(() => setMounted(false), 300)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Fechar detalhes"
        onClick={onClose}
        className={`absolute inset-0 h-full w-full bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-brand-surface rounded-t-[2rem] border-t-2 border-brand-green/30 p-5 transition-transform duration-300 ${
          entered ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-brand-gray/40" />
        {children}
      </div>
    </div>
  )
}
