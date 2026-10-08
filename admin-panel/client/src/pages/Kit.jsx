import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getKit, saveKit } from '../api/admin'
import { listProducts } from '../api/catalog'

export default function Kit() {
  const [kit, setKit] = useState({ name: 'School Kit', description: '', price: 2499, isActive: true })
  const [items, setItems] = useState([])
  const [warnings, setWarnings] = useState([])
  const [products, setProducts] = useState([])

  async function load() {
    try {
      const [kitRes, prodRes] = await Promise.all([
        getKit(),
        listProducts({ page: 1, pageSize: 100, status: 'active' }),
      ])
      if (kitRes.data.kit) setKit(kitRes.data.kit)
      setItems(kitRes.data.items || [])
      setWarnings(kitRes.data.warnings || [])
      setProducts(prodRes.data.items)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load kit')
    }
  }

  useEffect(() => { load() }, [])

  async function onSave(e) {
    e.preventDefault()
    try {
      await saveKit({
        name: kit.name,
        description: kit.description || '',
        price: Number(kit.price),
        isActive: kit.isActive,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          studentPicksSize: Boolean(i.studentPicksSize),
          autoMatchHouseColor: Boolean(i.autoMatchHouseColor),
        })),
      })
      toast.success('Kit saved')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Kit management</h1>
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Stock warning:</strong> some kit products have zero-stock variants —{' '}
          {warnings.map((w) => w.productName).join(', ')}
        </div>
      )}

      <form onSubmit={onSave} className="space-y-4 rounded-xl border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Name
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={kit.name} onChange={(e) => setKit((k) => ({ ...k, name: e.target.value }))} />
          </label>
          <label className="text-sm">Bundle price
            <input type="number" className="mt-1 w-full rounded-lg border px-3 py-2" value={kit.price} onChange={(e) => setKit((k) => ({ ...k, price: e.target.value }))} />
          </label>
        </div>
        <label className="block text-sm">Description
          <textarea className="mt-1 w-full rounded-lg border px-3 py-2" rows={3} value={kit.description || ''} onChange={(e) => setKit((k) => ({ ...k, description: e.target.value }))} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={kit.isActive} onChange={(e) => setKit((k) => ({ ...k, isActive: e.target.checked }))} />
          Active
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Kit items</h2>
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              onClick={() => {
                if (!products[0]) return
                setItems((list) => [
                  ...list,
                  {
                    productId: products[0].id,
                    productName: products[0].name,
                    quantity: 1,
                    studentPicksSize: true,
                    autoMatchHouseColor: false,
                  },
                ])
              }}
            >
              Add product
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-5">
                <select
                  className="rounded border px-2 py-1 text-sm sm:col-span-2"
                  value={item.productId}
                  onChange={(e) => {
                    const p = products.find((x) => String(x.id) === e.target.value)
                    const next = [...items]
                    next[idx] = { ...item, productId: Number(e.target.value), productName: p?.name }
                    setItems(next)
                  }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className="rounded border px-2 py-1 text-sm"
                  value={item.quantity}
                  onChange={(e) => {
                    const next = [...items]
                    next[idx] = { ...item, quantity: Number(e.target.value) }
                    setItems(next)
                  }}
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={item.studentPicksSize}
                    onChange={(e) => {
                      const next = [...items]
                      next[idx] = { ...item, studentPicksSize: e.target.checked }
                      setItems(next)
                    }}
                  />
                  Picks size
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={item.autoMatchHouseColor}
                    onChange={(e) => {
                      const next = [...items]
                      next[idx] = { ...item, autoMatchHouseColor: e.target.checked }
                      setItems(next)
                    }}
                  />
                  Auto house color
                </label>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Save kit</button>
      </form>
    </div>
  )
}
