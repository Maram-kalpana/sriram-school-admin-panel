import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ superAdminOnly = false }) {
  const { admin, loading, isAuthenticated, isSuperAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (superAdminOnly && !isSuperAdmin) {
    return <Navigate to="/admin" replace />
  }

  return <Outlet context={{ admin }} />
}
