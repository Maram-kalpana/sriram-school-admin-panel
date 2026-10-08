import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { createCategory, deleteCategory, listCategories, updateCategory } from '../api/catalog'

export default function Categories() {
  const { isSuperAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name: '', sortOrder: 0, isActive: true })
  const [editing, setEditing] = useState(null)

  async function load() {
    try {
      const res = await listCategories()
      setItems(res.data.items)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    try {
      if (editing) {
        await updateCategory(editing.id, form)
        toast.success('Updated')
      } else {
        await createCategory(form)
        toast.success('Created')
      }
      setForm({ name: '', sortOrder: 0, isActive: true })
      setEditing(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Categories</h1>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4">
        <label className="text-sm">
          Name
          <input
            className="mt-1 block rounded-lg border px-3 py-2"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </label>
        <label className="text-sm">
          Sort
          <input
            type="number"
            className="mt-1 block w-24 rounded-lg border px-3 py-2"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          />
          Active
        </label>
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">
          {editing ? 'Update' : 'Add'}
        </button>
        {editing && (
          <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => { setEditing(null); setForm({ name: '', sortOrder: 0, isActive: true }) }}>
            Cancel
          </button>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Slug</th>
              <th className="px-3 py-3">Sort</th>
              <th className="px-3 py-3">Active</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.slug}</td>
                <td className="px-3 py-2">{c.sortOrder}</td>
                <td className="px-3 py-2">{c.isActive ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2 space-x-2">
                  <button
                    type="button"
                    className="text-indigo-600"
                    onClick={() => {
                      setEditing(c)
                      setForm({ name: c.name, sortOrder: c.sortOrder, isActive: c.isActive })
                    }}
                  >
                    Edit
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={async () => {
                        if (!window.confirm('Delete category?')) return
                        try {
                          await deleteCategory(c.id)
                          toast.success('Deleted')
                          load()
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Delete failed')
                        }
                      }}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
