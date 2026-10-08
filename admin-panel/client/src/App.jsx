import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SuperAdminGate from './components/SuperAdminGate'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Students from './pages/Students'
import Categories from './pages/Categories'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import Inventory from './pages/Inventory'
import Kit from './pages/Kit'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import PackingSlip from './pages/PackingSlip'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Admins from './pages/Admins'

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/orders/packing" element={<PackingSlip />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id" element={<ProductForm />} />
            <Route path="categories" element={<Categories />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="kit" element={<Kit />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route element={<SuperAdminGate />}>
              <Route path="settings" element={<Settings />} />
              <Route path="admins" element={<Admins />} />
            </Route>
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AuthProvider>
  )
}
