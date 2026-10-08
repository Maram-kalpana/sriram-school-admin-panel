import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import toast from 'react-hot-toast'
import { getDashboard } from '../api/admin'

export default function Dashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load dashboard'))
  }, [])

  if (!data) return <p className="text-slate-500">Loading dashboard…</p>

  const cards = [
    ['Students', data.cards.totalStudents],
    ['Logged in once', data.cards.studentsLoggedIn],
    ['Kit orders', data.cards.kitOrders],
    ['Individual orders', data.cards.individualOrders],
    ['Revenue (paid)', `₹${data.cards.totalRevenue}`],
    ['Pending orders', data.cards.pendingOrders],
    ['Low stock', data.cards.lowStockVariants],
    ['Out of stock', data.cards.outOfStockVariants],
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Orders per day (30 days)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.ordersPerDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">Recent orders</h2>
          <ul className="space-y-2 text-sm">
            {data.recentOrders.map((o) => (
              <li key={o.id} className="flex justify-between border-b py-2">
                <Link className="text-indigo-600" to={`/admin/orders/${o.id}`}>{o.order_number}</Link>
                <span className="text-slate-500">{o.student_name} · ₹{o.total}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-semibold">Low stock alerts</h2>
          <ul className="space-y-2 text-sm">
            {data.lowStockList.map((v) => (
              <li key={v.sku} className="flex justify-between border-b py-2">
                <span>{v.product_name} · {v.sku}</span>
                <span className="font-medium text-amber-700">{v.stock_qty}</span>
              </li>
            ))}
            {!data.lowStockList.length && <li className="text-slate-400">All good</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}
