import { useEffect, useRef, useState } from 'react'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  /** Accessible name for the combobox (used as aria-label). */
  ariaLabel?: string
  /** Forwarded to the trigger so a visible <label htmlFor> can target it. */
  id?: string
  className?: string
  /** Stretch the trigger to fill its container (e.g. inside a form). */
  block?: boolean
}

const triggerClass =
  'flex items-center justify-between gap-2 bg-brand-input text-gray-300 text-xs rounded-2xl px-3 py-1.5 border-2 border-brand-green/20 transition-all duration-300 focus:outline-none focus:border-brand-green focus:bg-brand-green/5 focus:shadow-neon-input'

/**
 * Neon Bubble dropdown (#40). A custom listbox (not a native <select>) so the
 * selected option can render with `bg-brand-green`, black text and a neon glow,
 * which native option rendering does not allow. Keyboard + a11y supported.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  id,
  className,
  block,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (open)
      setActive(
        Math.max(
          0,
          options.findIndex((o) => o.value === value)
        )
      )
  }, [open, options, value])

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const choose = (v: T) => {
    onChange(v)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) setOpen(true)
        else setActive((i) => Math.min(options.length - 1, i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => Math.max(0, i - 1))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open) choose(options[active].value)
        else setOpen(true)
        break
      case 'Escape':
        setOpen(false)
        break
    }
  }

  return (
    <div ref={ref} className={`relative ${block ? 'w-full' : ''} ${className ?? ''}`}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`${triggerClass} ${block ? 'w-full' : ''}`}
      >
        <span>{selected?.label}</span>
        <span aria-hidden="true" className="text-brand-gray">
          ▾
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 z-20 mt-1 min-w-full bg-brand-input rounded-2xl border-2 border-brand-green/20 p-1 shadow-neon-input"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o.value)}
                className={`px-3 py-1.5 rounded-xl text-xs cursor-pointer whitespace-nowrap transition-all duration-300 ${
                  isSelected
                    ? 'bg-brand-green text-black shadow-neon-active'
                    : i === active
                      ? 'bg-brand-green/10 text-gray-100'
                      : 'text-gray-300'
                }`}
              >
                {o.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
