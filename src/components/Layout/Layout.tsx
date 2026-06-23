import { Outlet } from 'react-router-dom'
import { NavBar } from '../NavBar/NavBar'

export const Layout = () => (
  <div className="min-h-screen bg-brand-bg text-white">
    <NavBar />
    <Outlet />
  </div>
)
