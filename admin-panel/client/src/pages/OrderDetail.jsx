import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getOrder, updateOrderPayment, updateOrderStatus } from '../api/admin'

export default function OrderDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('confirmed')
  const [note, setNote] = useState('')

  async function load() {
    try {
      const res = await getOrder(id)
      setData(res.data)
      setStatus(res.data.order.status)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load')
    }
  }

  useEffect(() => { load() }, [id])

  if (!data) return <p className="text-slate-500">Loading…</p>
  const { order, items, history } = data
  const addr = order.addressSnapshot || {}

  return (
    <div className="space-y-4">
      <Link to="/admin/orders" className="text-sm text-indigo-600">← Orders</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-slate-500 capitalize">{order.type} · {order.status} · {order.paymentStatus}</p>
        </div>
        <Link to={`/admin/orders/packing?ids=${order.id}`} target="_blank" className="rounded-lg border px-3 py-2 text-sm">
          Print packing slip
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-4 text-sm">
          <h2 className="mb-2 font-semibold">Student & address</h2>
          <p>{order.admissionNumber} · {order.studentName} · {order.houseColor}</p>
          <p className="mt-2">{addr.parentName}</p>
          <p>{addr.address1}</p>
          <p>{addr.address2}</p>
          <p>{addr.city}, {addr.state} {addr.zipcode}</p>
          <p>{addr.phone || data.studentPhone || '—'}</p>
        </section>

        <section className="rounded-xl border bg-white p-4 text-sm">
          <h2 className="mb-2 font-semibold">Totals</h2>
          <p>Subtotal: ₹{order.subtotal}</p>
          <p>Tax: ₹{order.tax}</p>
          <p>Shipping: ₹{order.shipping}</p>
          <p className="font-bold">Total: ₹{order.total}</p>
          <p className="mt-2 capitalize">Payment: {order.paymentMethod} · {order.paymentStatus}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white" onClick={async () => { await updateOrderPayment(id, 'paid'); toast.success('Marked paid'); load() }}>Mark paid</button>
            <button type="button" className="rounded-lg border px-3 py-1.5" onClick={async () => { await updateOrderPayment(id, 'refunded'); toast.success('Refunded'); load() }}>Refund</button>
          </div>
        </section>
      </div>

      <section className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">Item</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">Options</th>
              <th className="px-3 py-3">Qty</th>
              <th className="px-3 py-3">Unit</th>
              <th className="px-3 py-3">Line</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-3 py-2">{i.nameSnapshot}</td>
                <td className="px-3 py-2 font-mono text-xs">{i.skuSnapshot}</td>
                <td className="px-3 py-2">{i.optionSnapshot}</td>
                <td className="px-3 py-2">{i.quantity}</td>
                <td className="px-3 py-2">₹{i.unitPrice}</td>
                <td className="px-3 py-2">₹{i.lineTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Update status</h2>
        <div className="flex flex-wrap gap-2">
          <select className="rounded-lg border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            {['placed','confirmed','packed','shipped','delivered','cancelled','returned'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="min-w-[200px] flex-1 rounded-lg border px-3 py-2 text-sm" placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
          <button
            type="button"
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white"
            onClick={async () => {
              try {
                await updateOrderStatus(id, { status, note })
                toast.success('Status updated')
                setNote('')
                load()
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed')
              }
            }}
          >
            Save status
          </button>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {history.map((h) => (
            <li key={h.id} className="border-l-2 border-indigo-200 pl-3">
              <strong className="capitalize">{h.status}</strong> · {h.changedBy || '—'} · {new Date(h.createdAt).toLocaleString()}
              {h.note && <p className="text-slate-500">{h.note}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
