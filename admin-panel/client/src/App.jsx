import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login'
import PlaceholderPage from './pages/PlaceholderPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <PlaceholderPage
                  title="Dashboard"
                  description="KPI cards and charts will land in the next steps."
                />
              }
            />
            <Route path="students" element={<PlaceholderPage title="Students" description="Excel import and student management." />} />
            <Route path="products" element={<PlaceholderPage title="Products" />} />
            <Route path="products/new" element={<PlaceholderPage title="Add product" />} />
            <Route path="products/:id" element={<PlaceholderPage title="Edit product" />} />
            <Route path="categories" element={<PlaceholderPage title="Categories" />} />
            <Route path="inventory" element={<PlaceholderPage title="Inventory" />} />
            <Route path="kit" element={<PlaceholderPage title="Kit" />} />
            <Route path="orders" element={<PlaceholderPage title="Orders" />} />
            <Route path="orders/:id" element={<PlaceholderPage title="Order detail" />} />
            <Route path="gst" element={<PlaceholderPage title="GST" description="Invoices, summaries, and tax mapping." />} />
            <Route path="settings" element={<PlaceholderPage title="Settings" description="General, store rules, Paytm, SMTP." />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}
