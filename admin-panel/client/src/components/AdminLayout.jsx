import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/kit', label: 'Kit' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/settings', label: 'Settings', superAdmin: true },
  { to: '/admin/admins', label: 'Admins', superAdmin: true },
  { to: '/admin/change-password', label: 'Password' },
]

export default function AdminLayout() {
  const { admin, logout, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
    }`

  const filtered = navItems.filter((item) => !item.superAdmin || isSuperAdmin)

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white p-4 transition lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 px-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Scholar Store
          </p>
          <h1 className="text-lg font-bold text-slate-900">Admin Panel</h1>
        </div>
        <nav className="space-y-1">
          {filtered.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm lg:hidden"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{admin?.name}</p>
              <p className="text-xs capitalize text-slate-500">{admin?.role?.replace('_', ' ')}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
