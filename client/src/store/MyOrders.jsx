import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { shopApi } from '../api.js';

export default function MyOrders() {
  const nav = useNavigate();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    shopApi.orders().then((r) => setRows(r.data)).catch(() => nav('/'));
  }, [nav]);
  if (!rows) return <div className="loading">Loading orders…</div>;
  return (
    <div>
      <nav className="store-nav"><Link to="/shop">Shop</Link></nav>
      <div className="page">
        <h2>My orders</h2>
        {rows.length === 0 && <div className="card empty">You have not ordered yet.</div>}
        {rows.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="card" style={{ display: 'block', padding: 14, marginBottom: 8 }}>
            <b>{o.order_number}</b> · {o.type} · {o.status} · ₹{o.total}
          </Link>
        ))}
      </div>
    </div>
  );
}
