import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getOrder } from '../api/admin'

export default function PackingSlip() {
  const [params] = useSearchParams()
  const ids = (params.get('ids') || '').split(',').filter(Boolean)
  const [orders, setOrders] = useState([])

  useEffect(() => {
    Promise.all(ids.map((id) => getOrder(id))).then((results) => {
      setOrders(results.map((r) => r.data))
    })
  }, [ids.join(',')])

  useEffect(() => {
    if (orders.length) {
      const t = setTimeout(() => window.print(), 400)
      return () => clearTimeout(t)
    }
  }, [orders])

  return (
    <div className="bg-white p-6 print:p-0">
      <style>{`@media print { .no-print { display: none } body { background: white } }`}</style>
      <button type="button" className="no-print mb-4 rounded border px-3 py-1 text-sm" onClick={() => window.print()}>Print</button>
      {orders.map((data) => {
        const o = data.order
        const addr = o.addressSnapshot || {}
        return (
          <article key={o.id} className="mb-8 break-after-page border p-6">
            <h1 className="text-xl font-bold">Scholar Store · Packing Slip</h1>
            <p className="text-sm text-slate-600">{o.orderNumber} · {new Date(o.createdAt).toLocaleString()}</p>
            <div className="mt-4 text-sm">
              <p className="font-semibold">{o.studentName} ({o.admissionNumber}) · {o.houseColor}</p>
              <p>{addr.address1}</p>
              <p>{addr.address2}</p>
              <p>{addr.city}, {addr.state} {addr.zipcode}</p>
            </div>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Item</th>
                  <th>SKU</th>
                  <th>Options</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((i) => (
                  <tr key={i.id} className="border-b">
                    <td className="py-2">{i.nameSnapshot}</td>
                    <td>{i.skuSnapshot}</td>
                    <td>{i.optionSnapshot}</td>
                    <td>{i.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 font-semibold">Total: ₹{o.total}</p>
          </article>
        )
      })}
    </div>
  )
}
