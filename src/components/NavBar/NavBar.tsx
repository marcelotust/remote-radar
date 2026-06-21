import { NavLink } from 'react-router-dom'

export const NavBar = () => (
  <nav className="flex items-center gap-6 px-6 py-4 bg-gray-900 border-b border-gray-800">
    <span className="text-white font-bold text-lg tracking-tight">Remote Radar</span>
    <NavLink
      to="/"
      className={({ isActive }) =>
        `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
      }
    >
      Dashboard
    </NavLink>
    <NavLink
      to="/wishlist"
      className={({ isActive }) =>
        `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
      }
    >
      Wishlist
    </NavLink>
  </nav>
)
