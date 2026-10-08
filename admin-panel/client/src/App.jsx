import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SuperAdminGate from './components/SuperAdminGate'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Placeholder from './pages/Placeholder'

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route
              index
              element={
                <Placeholder
                  title="Dashboard"
                  description="Metrics and charts arrive in Step 8."
                />
              }
            />
            <Route path="students" element={<Placeholder title="Students" />} />
            <Route path="products" element={<Placeholder title="Products" />} />
            <Route path="categories" element={<Placeholder title="Categories" />} />
            <Route path="inventory" element={<Placeholder title="Inventory" />} />
            <Route path="kit" element={<Placeholder title="Kit" />} />
            <Route path="orders" element={<Placeholder title="Orders" />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route element={<SuperAdminGate />}>
              <Route path="settings" element={<Placeholder title="Settings" />} />
              <Route path="admins" element={<Placeholder title="Admins" />} />
            </Route>
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AuthProvider>
  )
}
