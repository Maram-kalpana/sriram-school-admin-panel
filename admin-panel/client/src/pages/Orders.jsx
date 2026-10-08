import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { bulkOrderStatus, listOrders, pickList } from '../api/admin'

export default function Orders() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [filters, setFilters] = useState({ search: '', status: '', type: '', paymentStatus: '', houseColor: '', from: '', to: '' })
  const [selected, setSelected] = useState([])
  const [pick, setPick] = useState(null)

  const load = useCallback(async (page = 1) => {
    try {
      const res = await listOrders({ page, pageSize: 20, ...filters })
      setItems(res.data.items)
      setPagination(res.data.pagination)
      setSelected([])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load orders')
    }
  }, [filters])

  useEffect(() => { load(1) }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex gap-2">
          <a href="/api/admin/orders/export?format=csv" className="rounded-lg border px-3 py-2 text-sm">Export CSV</a>
          <a href="/api/admin/orders/export?format=xlsx" className="rounded-lg border px-3 py-2 text-sm">Export Excel</a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-3">
        <input className="min-w-[160px] flex-1 rounded-lg border px-3 py-2 text-sm" placeholder="Search" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
        <select className="rounded-lg border px-3 py-2 text-sm" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All status</option>
          {['placed','confirmed','packed','shipped','delivered','cancelled','returned'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="rounded-lg border px-3 py-2 text-sm" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
          <option value="">All types</option>
          <option value="kit">Kit</option>
          <option value="individual">Individual</option>
        </select>
        <select className="rounded-lg border px-3 py-2 text-sm" value={filters.paymentStatus} onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}>
          <option value="">All payment</option>
          {['pending','paid','failed','refunded'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="rounded-lg border px-3 py-2 text-sm" value={filters.houseColor} onChange={(e) => setFilters((f) => ({ ...f, houseColor: e.target.value }))}>
          <option value="">All houses</option>
          {['Red','Yellow','Green','Blue'].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" className="rounded-lg border px-3 py-2 text-sm" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
        <input type="date" className="rounded-lg border px-3 py-2 text-sm" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
        <button type="button" onClick={() => load(1)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">Apply</button>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border px-3 py-1.5 text-sm"
            defaultValue=""
            onChange={async (e) => {
              if (!e.target.value) return
              await bulkOrderStatus(selected, e.target.value)
              toast.success('Status updated')
              load(pagination.page)
            }}
          >
            <option value="">Bulk status…</option>
            {['confirmed','packed','shipped','delivered','cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-sm"
            onClick={async () => {
              const res = await pickList(selected)
              setPick(res.data.lines)
            }}
          >
            Pick list
          </button>
          <Link
            className="rounded-lg border px-3 py-1.5 text-sm"
            to={`/admin/orders/packing?ids=${selected.join(',')}`}
            target="_blank"
          >
            Packing slips
          </Link>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3"><input type="checkbox" checked={items.length > 0 && selected.length === items.length} onChange={(e) => setSelected(e.target.checked ? items.map((i) => i.id) : [])} /></th>
              <th className="px-3 py-3">Order</th>
              <th className="px-3 py-3">Student</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Items</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">Payment</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-3 py-2"><input type="checkbox" checked={selected.includes(o.id)} onChange={() => setSelected((s) => s.includes(o.id) ? s.filter((x) => x !== o.id) : [...s, o.id])} /></td>
                <td className="px-3 py-2"><Link className="font-medium text-indigo-600" to={`/admin/orders/${o.id}`}>{o.orderNumber}</Link></td>
                <td className="px-3 py-2">{o.admissionNumber} · {o.studentName} · {o.houseColor}</td>
                <td className="px-3 py-2 capitalize">{o.type}</td>
                <td className="px-3 py-2">{o.itemCount}</td>
                <td className="px-3 py-2">₹{o.total}</td>
                <td className="px-3 py-2 capitalize">{o.paymentStatus}</td>
                <td className="px-3 py-2 capitalize">{o.status}</td>
                <td className="px-3 py-2">{new Date(o.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5">
            <div className="mb-3 flex justify-between"><h2 className="font-bold">Pick list</h2><button type="button" onClick={() => setPick(null)}>✕</button></div>
            <ul className="space-y-2 text-sm">
              {pick.map((l) => (
                <li key={l.sku + l.options} className="flex justify-between border-b py-1">
                  <span>{l.sku} · {l.options || '—'} · {l.name}</span>
                  <strong>×{l.quantity}</strong>
                </li>
              ))}
            </ul>
            <button type="button" className="mt-4 rounded-lg border px-3 py-2 text-sm" onClick={() => window.print()}>Print</button>
          </div>
        </div>
      )}
    </div>
  )
}
