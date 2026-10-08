import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import {
  bulkProductStatus,
  deleteProduct,
  duplicateProduct,
  listCategories,
  listProducts,
} from '../api/catalog'

export default function Products() {
  const { isSuperAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const res = await listProducts({ page, pageSize: 20, search, categoryId, status, stockFilter })
      setItems(res.data.items)
      setPagination(res.data.pagination)
      setSelected([])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [categoryId, search, status, stockFilter])

  useEffect(() => {
    listCategories().then((r) => setCategories(r.data.items)).catch(() => {})
    load(1)
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-slate-500">Manage catalog, variants, and individual visibility.</p>
        </div>
        <Link
          to="/admin/products/new"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Add product
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-3">
        <input
          className="min-w-[180px] flex-1 rounded-lg border px-3 py-2 text-sm"
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="rounded-lg border px-3 py-2 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="rounded-lg border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <select className="rounded-lg border px-3 py-2 text-sm" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
          <option value="">All stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <button type="button" onClick={() => load(1)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">Apply</button>
      </div>

      {selected.length > 0 && (
        <div className="flex gap-2">
          {['active', 'draft', 'archived'].map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm capitalize"
              onClick={async () => {
                await bulkProductStatus(selected, s)
                toast.success(`Set to ${s}`)
                load(pagination.page)
              }}
            >
              Set {s}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selected.length === items.length}
                  onChange={(e) => setSelected(e.target.checked ? items.map((i) => i.id) : [])}
                />
              </th>
              <th className="px-3 py-3">Image</th>
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-3 py-3">Variants</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">Loading…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">No products</td></tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={() =>
                      setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  {p.primaryImage ? (
                    <img src={p.primaryImage} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">—</div>
                  )}
                </td>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2">{p.categoryName}</td>
                <td className="px-3 py-2 capitalize">{p.status}</td>
                <td className="px-3 py-2">{p.totalStock}</td>
                <td className="px-3 py-2">{p.variantCount}</td>
                <td className="px-3 py-2 space-x-2">
                  <Link className="text-indigo-600" to={`/admin/products/${p.id}`}>Edit</Link>
                  <button
                    type="button"
                    className="text-slate-600"
                    onClick={async () => {
                      const res = await duplicateProduct(p.id)
                      toast.success('Duplicated')
                      window.location.assign(`/admin/products/${res.data.id}`)
                    }}
                  >
                    Duplicate
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      className="text-red-600"
                      onClick={async () => {
                        if (!window.confirm('Delete product?')) return
                        try {
                          await deleteProduct(p.id)
                          toast.success('Deleted')
                          load(pagination.page)
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

      <div className="flex justify-between text-sm">
        <p className="text-slate-500">Page {pagination.page} / {pagination.totalPages}</p>
        <div className="flex gap-2">
          <button type="button" disabled={pagination.page <= 1} className="rounded border px-3 py-1 disabled:opacity-40" onClick={() => load(pagination.page - 1)}>Prev</button>
          <button type="button" disabled={pagination.page >= pagination.totalPages} className="rounded border px-3 py-1 disabled:opacity-40" onClick={() => load(pagination.page + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
