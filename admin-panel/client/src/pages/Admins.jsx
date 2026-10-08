import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createAdmin, listAdmins, updateAdmin } from '../api/admin'

export default function Admins() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' })

  async function load() {
    const res = await listAdmins()
    setItems(res.data.items)
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.response?.data?.message || 'Failed'))
  }, [])

  async function onCreate(e) {
    e.preventDefault()
    try {
      await createAdmin(form)
      toast.success('Admin created')
      setForm({ name: '', email: '', password: '', role: 'staff' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Admin users</h1>
      <form onSubmit={onCreate} className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-5">
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
        <select className="rounded-lg border px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
          <option value="staff">Staff</option>
          <option value="super_admin">Super admin</option>
        </select>
        <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">Create</button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Active</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-3 py-2">{a.name}</td>
                <td className="px-3 py-2">{a.email}</td>
                <td className="px-3 py-2">{a.role}</td>
                <td className="px-3 py-2">{a.isActive ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2 space-x-2">
                  <button type="button" className="text-slate-600" onClick={async () => {
                    await updateAdmin(a.id, { isActive: !a.isActive })
                    toast.success('Updated')
                    load()
                  }}>{a.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button type="button" className="text-indigo-600" onClick={async () => {
                    const password = window.prompt('New password (min 8 chars)')
                    if (!password) return
                    await updateAdmin(a.id, { password })
                    toast.success('Password reset')
                  }}>Reset password</button>
                  <button type="button" className="text-amber-700" onClick={async () => {
                    const role = a.role === 'staff' ? 'super_admin' : 'staff'
                    await updateAdmin(a.id, { role })
                    toast.success(`Role → ${role}`)
                    load()
                  }}>Toggle role</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
