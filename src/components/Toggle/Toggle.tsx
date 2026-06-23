interface Props {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/**
 * Neon Bubble switch (#40). A real, visually-hidden checkbox drives the state
 * (keeps native accessibility + `getByLabelText`/`toBeChecked`), while the pill
 * and knob are pure HTML/Tailwind.
 */
export const Toggle = ({ id, label, checked, onChange }: Props) => (
  <label
    htmlFor={id}
    className="relative inline-flex items-center gap-2 cursor-pointer text-sm text-gray-300"
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="peer sr-only"
    />
    {/* track */}
    <span
      aria-hidden="true"
      className="block w-11 h-6 rounded-full border-2 border-brand-gray/30 bg-transparent transition-all duration-300 peer-checked:border-brand-green peer-checked:bg-brand-green peer-checked:shadow-neon-active peer-focus-visible:ring-2 peer-focus-visible:ring-brand-green/60"
    />
    {/* knob */}
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1 top-1 w-4 h-4 rounded-full bg-brand-gray transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-black"
    />
    {label}
  </label>
)
