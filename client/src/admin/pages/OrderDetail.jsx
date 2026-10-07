import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';

const NEXT = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];

export default function OrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [o, setO] = useState(null);
  const [status, setStatus] = useState('confirmed');
  const [note, setNote] = useState('');
  useEffect(() => { adminApi.order(id).then((r) => { setO(r.data); setStatus(r.data.status); }); }, [id]);
  if (!o) return <div className="page loading">Loading order…</div>;
  const addr = o.shipping_address_snapshot || {};
  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{o.order_number}</h2>
        <Link className="btn ghost" to={`/admin/orders/${id}/print`}>Print packing slip / invoice</Link>
      </div>
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <p><b>{o.student_name}</b> ({o.admission_number}) · House {o.house_color}</p>
        <p>{addr.address1} {addr.address2}<br />{addr.city} {addr.state} {addr.zipcode}</p>
        <p>Type {o.type} · Payment {o.payment_method} / {o.payment_status}</p>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <table className="table">
          <thead><tr><th>Item</th><th>SKU</th><th>Size</th><th>Color</th><th>Qty</th><th>Line</th></tr></thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id}>
                <td>{i.name_snapshot}</td><td>{i.sku_snapshot}</td><td>{i.size_snapshot}</td>
                <td>{i.color_snapshot}</td><td>{i.quantity}</td><td>₹{i.line_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ padding: 12 }}>Subtotal ₹{o.subtotal} · Tax ₹{o.tax} · Ship ₹{o.shipping} · <b>Total ₹{o.total}</b></p>
      </div>
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h3>Status</h3>
        <div className="row">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {NEXT.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className="input grow" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn" onClick={async () => {
            await adminApi.setOrderStatus(id, { status, note });
            toast('Status updated');
            setO((await adminApi.order(id)).data);
          }}>Update</button>
        </div>
        <ul>
          {(o.history || []).map((h) => (
            <li key={h.id}>{h.created_at} · {h.status} · {h.changed_by} · {h.note || ''}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
