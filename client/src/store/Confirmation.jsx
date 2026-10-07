import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { shopApi } from '../api.js';

export default function Confirmation() {
  const { id } = useParams();
  const [o, setO] = useState(null);
  useEffect(() => { shopApi.order(id).then((r) => setO(r.data)); }, [id]);
  if (!o) return <div className="loading">Loading…</div>;
  return (
    <div className="page">
      <div className="card" style={{ padding: 20 }}>
        <h2>Thank you — {o.order_number}</h2>
        <p>Status {o.status} · {o.payment_method} · Total ₹{o.total}</p>
        <ul>{o.items.map((i) => <li key={i.id}>{i.name_snapshot} × {i.quantity}</li>)}</ul>
        <Link className="btn" to="/orders">My orders</Link>
      </div>
    </div>
  );
}
