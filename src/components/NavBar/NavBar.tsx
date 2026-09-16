import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/inbox', label: 'Caixa', end: false },
  { to: '/scraping-sources', label: 'Fontes', end: false },
  { to: '/settings', label: 'Ajustes', end: false },
]

export const NavBar = () => {
  const { signOut } = useAuth()

  return (
    <nav className="flex flex-wrap items-center gap-6 px-6 py-4 bg-brand-bg border-b border-brand-gray/20">
      <span className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
        <span aria-hidden="true">📡</span>
        Remote Radar
      </span>
      {links.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `text-sm font-medium transition-all duration-300 ${isActive ? 'text-brand-green' : 'text-gray-400 hover:text-white'}`
          }
        >
          {label}
        </NavLink>
      ))}
      <button
        onClick={() => signOut()}
        className="ml-auto text-sm font-medium text-gray-400 hover:text-white"
      >
        Sair
      </button>
    </nav>
  )
}
