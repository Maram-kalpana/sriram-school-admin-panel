import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';

export default function Orders() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0 });
  const [filters, setFilters] = useState({ q: '', status: '', type: '', house_color: '', from: '', to: '' });
  const [selected, setSelected] = useState([]);
  const [pick, setPick] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load(page = 1) {
    setLoading(true);
    const qs = new URLSearchParams({ ...filters, page });
    const r = await adminApi.orders(qs.toString());
    setRows(r.data); setMeta(r.meta); setLoading(false);
  }
  useEffect(() => { load(1).catch((e) => toast(e.message)); }, []);

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Orders</h2>
        <a className="btn ghost" href="/api/admin/orders/export.csv">Export CSV</a>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input grow" placeholder="Search" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Status</option>
          {['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">Type</option><option>kit</option><option>individual</option>
        </select>
        <select value={filters.house_color} onChange={(e) => setFilters({ ...filters, house_color: e.target.value })}>
          <option value="">House</option>
          {['Red', 'Yellow', 'Green', 'Blue'].map((h) => <option key={h}>{h}</option>)}
        </select>
        <input className="input" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        <input className="input" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        <button className="btn" onClick={() => load(1)}>Filter</button>
      </div>
      {selected.length > 0 && (
        <button className="btn sm" onClick={async () => setPick((await adminApi.pickList(selected)).data)}>Pick list for selected</button>
      )}
      {loading && <div className="loading">Loading orders…</div>}
      {!loading && rows.length === 0 && <div className="card empty">No orders</div>}
      {!loading && rows.length > 0 && (
        <div className="card">
          <table className="table">
            <thead><tr><th></th><th>Order</th><th>Student</th><th>Type</th><th>Items</th><th>Total</th><th>Pay</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td><input type="checkbox" checked={selected.includes(o.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, o.id] : selected.filter((id) => id !== o.id))} /></td>
                  <td><Link to={`/admin/orders/${o.id}`}>{o.order_number}</Link></td>
                  <td>{o.admission_number} {o.student_name}</td>
                  <td>{o.type}</td>
                  <td>{o.items_count}</td>
                  <td>₹{o.total}</td>
                  <td>{o.payment_status}</td>
                  <td><span className="badge">{o.status}</span></td>
                  <td>{String(o.created_at).slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ padding: 12 }}>
            <span className="muted">{meta.total} orders</span>
            <button className="btn ghost sm" onClick={() => load(meta.page - 1)}>Prev</button>
            <button className="btn ghost sm" onClick={() => load(meta.page + 1)}>Next</button>
          </div>
        </div>
      )}
      {pick && (
        <div className="drawer" onClick={() => setPick(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <h3>Pick list by SKU</h3>
            <button className="btn ghost sm" onClick={() => window.print()}>Print</button>
            <table className="table">
              <thead><tr><th>SKU</th><th>Item</th><th>Size/Color</th><th>Qty</th></tr></thead>
              <tbody>
                {pick.map((r) => (
                  <tr key={r.sku_snapshot}>
                    <td>{r.sku_snapshot}</td>
                    <td>{r.name_snapshot}</td>
                    <td>{[r.size_snapshot, r.color_snapshot].filter(Boolean).join(' / ')}</td>
                    <td>{r.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
