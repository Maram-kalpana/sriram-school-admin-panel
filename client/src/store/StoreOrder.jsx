import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { shopApi } from '../api.js';

export default function StoreOrder() {
  const { id } = useParams();
  const [o, setO] = useState(null);
  useEffect(() => { shopApi.order(id).then((r) => setO(r.data)); }, [id]);
  if (!o) return <div className="loading">Loading…</div>;
  return (
    <div className="page">
      <Link to="/orders">← All orders</Link>
      <h2>{o.order_number}</h2>
      <p>{o.type} · ₹{o.total} · {o.payment_status}</p>
      <ul>{o.items.map((i) => <li key={i.id}>{i.name_snapshot} ({i.sku_snapshot}) × {i.quantity}</li>)}</ul>
      <h3>Timeline</h3>
      <ol>{(o.history || []).map((h) => <li key={h.id}>{h.status} — {h.note} ({h.created_at})</li>)}</ol>
    </div>
  );
}
