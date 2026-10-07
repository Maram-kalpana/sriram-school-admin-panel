import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';

export default function Inventory() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [stock, setStock] = useState('');
  const [q, setQ] = useState('');
  const [hist, setHist] = useState(null);
  const [move, setMove] = useState(null);

  async function load() {
    const qs = new URLSearchParams({ q, stock });
    const r = await adminApi.inventory(qs.toString());
    setRows(r.data);
  }
  useEffect(() => { load().catch((e) => toast(e.message)); }, []);

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Inventory</h2>
        <a className="btn ghost" href="/api/admin/inventory/export.csv">Export CSV</a>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="SKU or product" />
        <select value={stock} onChange={(e) => setStock(e.target.value)}>
          <option value="">All</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <button className="btn" onClick={load}>Filter</button>
      </div>
      {rows.length === 0 && <div className="card empty">No variants</div>}
      {rows.length > 0 && (
        <div className="card">
          <table className="table">
            <thead><tr><th>SKU</th><th>Product</th><th>Options</th><th>Stock</th><th>Low</th><th></th></tr></thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <td>{v.sku}</td>
                  <td>{v.product_name}</td>
                  <td>{[v.option1_value, v.option2_value].filter(Boolean).join(' / ')}</td>
                  <td className={v.stock_qty <= 0 ? 'badge red' : v.stock_qty <= v.low_stock_threshold ? 'badge amber' : ''}>{v.stock_qty}</td>
                  <td>{v.low_stock_threshold}</td>
                  <td className="row">
                    <button className="btn sm" onClick={() => setMove({ id: v.id, reason: 'restock', change_qty: 10, note: '' })}>Restock</button>
                    <button className="btn ghost sm" onClick={() => setMove({ id: v.id, reason: 'adjustment', change_qty: 0, note: '' })}>Adjust</button>
                    <button className="btn ghost sm" onClick={async () => setHist((await adminApi.movements(v.id)).data)}>History</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {move && (
        <div className="drawer" onClick={() => setMove(null)}>
          <form className="drawer-panel" onClick={(e) => e.stopPropagation()} onSubmit={async (e) => {
            e.preventDefault();
            await adminApi.stockMove(move.id, { reason: move.reason, change_qty: Number(move.change_qty), note: move.note });
            toast('Stock updated');
            setMove(null);
            load();
          }}>
            <h3>{move.reason}</h3>
            <p className="muted">Every change writes a stock movement.</p>
            <label>Qty change<input className="input" type="number" value={move.change_qty} onChange={(e) => setMove({ ...move, change_qty: e.target.value })} /></label>
            <label>Reason / note<input className="input" required value={move.note} onChange={(e) => setMove({ ...move, note: e.target.value })} /></label>
            <button className="btn" style={{ marginTop: 12 }}>Apply</button>
          </form>
        </div>
      )}
      {hist && (
        <div className="drawer" onClick={() => setHist(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <h3>Movements</h3>
            {hist.length === 0 && <div className="empty">None</div>}
            {hist.map((m) => (
              <div key={m.id}>{m.created_at} · {m.reason} · {m.change_qty} · {m.note || ''}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
