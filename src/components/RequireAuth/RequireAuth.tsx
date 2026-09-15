import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export const RequireAuth = () => {
  const { session, loading } = useAuth()

  if (loading) return <p className="p-6 text-gray-400">Carregando...</p>
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
