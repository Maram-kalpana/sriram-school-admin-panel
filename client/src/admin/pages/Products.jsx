import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';

export default function Products() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ category_id: '', status: '', stock: '' });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams({ ...filters, q });
    const [p, c] = await Promise.all([adminApi.products(qs.toString()), adminApi.categories()]);
    setRows(p.data); setCats(c.data); setLoading(false);
  }
  useEffect(() => { load().catch((e) => toast(e.message)); }, []);

  const img = (p) => (Array.isArray(p.images) && p.images[0]) || '';

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Products</h2>
        <Link className="btn" to="/admin/products/new">Add product</Link>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" />
        <select value={filters.category_id} onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}>
          <option value="">Category</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Status</option>
          <option>draft</option><option>active</option><option>archived</option>
        </select>
        <select value={filters.stock} onChange={(e) => setFilters({ ...filters, stock: e.target.value })}>
          <option value="">Stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <button className="btn" onClick={load}>Filter</button>
      </div>
      {selected.length > 0 && (
        <div className="row" style={{ marginBottom: 8 }}>
          {['active', 'draft', 'archived'].map((s) => (
            <button key={s} className="btn sm ghost" onClick={async () => { await adminApi.bulkProductStatus({ ids: selected, status: s }); toast(`Marked ${s}`); load(); }}>Mark {s}</button>
          ))}
        </div>
      )}
      {loading && <div className="loading">Loading products…</div>}
      {!loading && rows.length === 0 && <div className="card empty">No products</div>}
      {!loading && rows.length > 0 && (
        <div className="card">
          <table className="table">
            <thead><tr><th></th><th></th><th>Name</th><th>Category</th><th>Status</th><th>Stock</th><th>Variants</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td><input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, p.id] : selected.filter((id) => id !== p.id))} /></td>
                  <td>{img(p) ? <img src={img(p)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} /> : <div className="thumb" style={{ width: 40, height: 40 }} />}</td>
                  <td><Link to={`/admin/products/${p.id}`}>{p.name}</Link></td>
                  <td>{p.category_name}</td>
                  <td><span className="badge">{p.status}</span></td>
                  <td>{p.total_stock}</td>
                  <td>{p.variants_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
