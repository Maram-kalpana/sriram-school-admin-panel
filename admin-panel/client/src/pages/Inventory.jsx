import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  adjustStock,
  bulkStockCommit,
  bulkStockPreview,
  listInventory,
  listMovements,
} from '../api/admin'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [dialog, setDialog] = useState(null)
  const [history, setHistory] = useState(null)
  const [bulkPreview, setBulkPreview] = useState(null)
  const [bulkFile, setBulkFile] = useState(null)

  const load = useCallback(async (page = 1) => {
    try {
      const res = await listInventory({ page, pageSize: 50, search, stockFilter })
      setItems(res.data.items)
      setPagination(res.data.pagination)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load')
    }
  }, [search, stockFilter])

  useEffect(() => { load(1) }, [load])

  async function submitAdjust(e) {
    e.preventDefault()
    try {
      await adjustStock(dialog.id, {
        mode: dialog.mode,
        quantity: Number(dialog.quantity),
        note: dialog.note,
      })
      toast.success('Stock updated')
      setDialog(null)
      load(pagination.page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          <a href="/api/admin/inventory/export" className="rounded-lg border px-3 py-2 text-sm">Export CSV</a>
          <label className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">
            Bulk Excel
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setBulkFile(file)
                try {
                  const res = await bulkStockPreview(file)
                  setBulkPreview(res.data)
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Preview failed')
                }
              }}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-3">
        <input className="flex-1 rounded-lg border px-3 py-2 text-sm" placeholder="Search SKU / product" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="rounded-lg border px-3 py-2 text-sm" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
          <option value="">All</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <button type="button" onClick={() => load(1)} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">Apply</button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">Options</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-3 py-3">Threshold</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="px-3 py-2">{v.productName}</td>
                <td className="px-3 py-2 font-mono text-xs">{v.sku}</td>
                <td className="px-3 py-2 text-xs">
                  {[v.option1Value, v.option2Value].filter(Boolean).join(' / ')}
                </td>
                <td className="px-3 py-2">{v.stockQty}</td>
                <td className="px-3 py-2">{v.lowStockThreshold}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-xs ${
                    v.statusBadge === 'out' ? 'bg-red-100 text-red-700' :
                    v.statusBadge === 'low' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>{v.statusBadge}</span>
                </td>
                <td className="px-3 py-2 space-x-2">
                  <button type="button" className="text-indigo-600" onClick={() => setDialog({ id: v.id, mode: 'set', quantity: v.stockQty, note: '', sku: v.sku })}>Set</button>
                  <button type="button" className="text-emerald-600" onClick={() => setDialog({ id: v.id, mode: 'restock', quantity: 10, note: '', sku: v.sku })}>Restock</button>
                  <button type="button" className="text-amber-600" onClick={() => setDialog({ id: v.id, mode: 'adjust', quantity: -1, note: '', sku: v.sku })}>Adjust</button>
                  <button type="button" className="text-slate-600" onClick={async () => {
                    const res = await listMovements(v.id)
                    setHistory({ sku: v.sku, items: res.data.items })
                  }}>History</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form onSubmit={submitAdjust} className="w-full max-w-md rounded-xl bg-white p-5">
            <h2 className="mb-3 text-lg font-bold capitalize">{dialog.mode} · {dialog.sku}</h2>
            <label className="block text-sm">Quantity
              <input type="number" className="mt-1 w-full rounded-lg border px-3 py-2" value={dialog.quantity} onChange={(e) => setDialog((d) => ({ ...d, quantity: e.target.value }))} required />
            </label>
            <label className="mt-3 block text-sm">Reason / note
              <input className="mt-1 w-full rounded-lg border px-3 py-2" value={dialog.note} onChange={(e) => setDialog((d) => ({ ...d, note: e.target.value }))} required />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setDialog(null)}>Cancel</button>
              <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">Save</button>
            </div>
          </form>
        </div>
      )}

      {history && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5">
            <div className="mb-3 flex justify-between"><h2 className="font-bold">Movements · {history.sku}</h2><button type="button" onClick={() => setHistory(null)}>✕</button></div>
            <ul className="space-y-2 text-sm">
              {history.items.map((m) => (
                <li key={m.id} className="rounded border p-2">
                  <span className={m.changeQty >= 0 ? 'text-emerald-600' : 'text-red-600'}>{m.changeQty > 0 ? '+' : ''}{m.changeQty}</span>
                  {' '}{m.reason} · {m.note || '—'} · {m.adminName || 'system'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {bulkPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5">
            <h2 className="mb-3 font-bold">Bulk stock preview</h2>
            <p className="text-sm text-slate-500">Valid {bulkPreview.counts.valid} / Invalid {bulkPreview.counts.invalid}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setBulkPreview(null)}>Close</button>
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white"
                onClick={async () => {
                  const res = await bulkStockCommit(bulkFile)
                  toast.success(`Updated ${res.data.updated}`)
                  setBulkPreview(null)
                  load(1)
                }}
              >
                Commit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
