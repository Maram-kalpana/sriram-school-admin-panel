import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminApi } from '../../api.js';

export default function PackingSlip() {
  const { id } = useParams();
  const [o, setO] = useState(null);
  useEffect(() => { adminApi.order(id).then((r) => setO(r.data)); }, [id]);
  if (!o) return <div className="loading">Loading…</div>;
  const addr = o.shipping_address_snapshot || {};
  return (
    <div className="print-page">
      <button className="btn" onClick={() => window.print()}>Print</button>
      <h1>Packing slip / Invoice</h1>
      <p><b>{o.order_number}</b> · {String(o.created_at).slice(0, 10)}</p>
      <p>Ship to: {addr.student_name || o.student_name}<br />{addr.address1} {addr.address2}<br />{addr.city} {addr.state} {addr.zipcode}</p>
      <table className="table">
        <thead><tr><th>SKU</th><th>Item</th><th>Size</th><th>Color</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id}>
              <td>{i.sku_snapshot}</td><td>{i.name_snapshot}</td><td>{i.size_snapshot}</td>
              <td>{i.color_snapshot}</td><td>{i.quantity}</td><td>₹{i.line_total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Total ₹{o.total} · {o.payment_method} ({o.payment_status})</h3>
    </div>
  );
}
