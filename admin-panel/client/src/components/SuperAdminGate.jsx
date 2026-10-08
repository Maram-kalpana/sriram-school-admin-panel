import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SuperAdminGate() {
  const { isSuperAdmin } = useAuth()
  if (!isSuperAdmin) {
    return <Navigate to="/admin" replace />
  }
  return <Outlet />
}
