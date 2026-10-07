import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';

export default function Categories() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', sort_order: 0 });
  async function load() { setRows((await adminApi.categories()).data); }
  useEffect(() => { load(); }, []);
  return (
    <div className="page">
      <h2>Categories</h2>
      <form className="card" style={{ padding: 16, marginBottom: 16 }} onSubmit={async (e) => {
        e.preventDefault();
        await adminApi.saveCategory(null, { ...form, sort_order: Number(form.sort_order) });
        toast('Category saved'); setForm({ name: '', slug: '', sort_order: 0 }); load();
      }}>
        <div className="row">
          <input className="input grow" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input grow" placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="input" style={{ width: 90 }} type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          <button className="btn">Add</button>
        </div>
      </form>
      {rows.length === 0 && <div className="card empty">No categories</div>}
      <div className="card">
        <table className="table">
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td><td>{c.slug}</td><td>{c.sort_order}</td>
                <td><button className="btn danger sm" onClick={async () => { await adminApi.deleteCategory(c.id); load(); }}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
