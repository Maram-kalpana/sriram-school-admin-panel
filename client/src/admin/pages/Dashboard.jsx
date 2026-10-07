import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    adminApi.stats().then((r) => setData(r.data)).catch((e) => setError(e.message));
  }, []);
  if (error) return <div className="page error">{error}</div>;
  if (!data) return <div className="page loading">Loading dashboard…</div>;
  const c = data.cards;
  const max = Math.max(1, ...data.perDay.map((d) => d.orders));
  return (
    <div className="page">
      <h2>Dashboard</h2>
      <div className="grid-cards">
        {[
          ['Students', c.students],
          ['Logged in', c.logged_in],
          ['Kit orders', c.kit_orders],
          ['Individual orders', c.individual_orders],
          ['Revenue', `₹${Number(c.revenue).toFixed(0)}`],
          ['Pending', c.pending_orders],
          ['Low stock', c.low_stock],
        ].map(([k, v]) => (
          <div className="card stat" key={k}><span className="muted">{k}</span><b>{v}</b></div>
        ))}
      </div>
      <h3>Orders last 14 days</h3>
      <div className="card chart">
        {data.perDay.length === 0 && <div className="empty">No orders yet</div>}
        {data.perDay.map((d) => (
          <span key={d.day} title={`${d.day}: ${d.orders}`} style={{ height: `${(d.orders / max) * 100}%` }} />
        ))}
      </div>
      <h3>Recent orders</h3>
      <div className="card">
        {data.recent.length === 0 ? <div className="empty">No orders yet</div> : (
          <table className="table">
            <thead><tr><th>Order</th><th>Student</th><th>Type</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              {data.recent.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/admin/orders/${o.id}`}>{o.order_number}</Link></td>
                  <td>{o.admission_number} {o.student_name}</td>
                  <td>{o.type}</td>
                  <td><span className="badge">{o.status}</span></td>
                  <td>₹{o.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
