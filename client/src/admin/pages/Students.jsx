import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';

const emptyForm = {
  admission_number: '', student_name: '', parent_name: '', address1: '', address2: '',
  city: '', state: '', zipcode: '', house_color: '', phone: '',
};

export default function Students() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, pageSize: 20 });
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ house_color: '', kit_status: '', is_active: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(null);
  const [preview, setPreview] = useState(null);

  async function load(page = 1) {
    setLoading(true); setError('');
    const qs = new URLSearchParams({ ...filters, q, page, pageSize: 20 });
    try {
      const r = await adminApi.students(qs.toString());
      setRows(r.data); setMeta(r.meta);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(1); }, []);

  async function openDetail(id) {
    const r = await adminApi.student(id);
    setDrawer(r.data);
  }

  async function saveForm(e) {
    e.preventDefault();
    await adminApi.saveStudent(form.id, { ...form, phone: form.phone || null });
    toast(form.id ? 'Student updated' : 'Student added');
    setForm(null);
    load(meta.page);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = await adminApi.previewImport(file);
    setPreview(r.data);
  }

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>Students</h2>
        <div className="row">
          <a className="btn ghost" href="/api/admin/students/template.xlsx">Download sample template</a>
          <label className="btn">Import Excel<input type="file" hidden accept=".xlsx,.xls,.csv" onChange={onFile} /></label>
          <a className="btn ghost" href="/api/admin/students/export.csv">Export CSV</a>
          <button className="btn" onClick={() => setForm({ ...emptyForm })}>Add student</button>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input grow" placeholder="Search admission / name / parent" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filters.house_color} onChange={(e) => setFilters({ ...filters, house_color: e.target.value })}>
          <option value="">All houses</option>
          {['Red', 'Yellow', 'Green', 'Blue'].map((h) => <option key={h}>{h}</option>)}
        </select>
        <select value={filters.kit_status} onChange={(e) => setFilters({ ...filters, kit_status: e.target.value })}>
          <option value="">Kit status</option>
          <option value="pending">pending</option>
          <option value="ordered">ordered</option>
        </select>
        <select value={filters.is_active} onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}>
          <option value="">Active?</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button className="btn" onClick={() => load(1)}>Filter</button>
      </div>

      {selected.length > 0 && (
        <div className="row" style={{ marginBottom: 8 }}>
          <button className="btn sm" onClick={async () => { await adminApi.bulkStudents({ ids: selected, action: 'activate' }); toast('Activated'); load(meta.page); }}>Activate</button>
          <button className="btn ghost sm" onClick={async () => { await adminApi.bulkStudents({ ids: selected, action: 'deactivate' }); toast('Deactivated'); load(meta.page); }}>Deactivate</button>
        </div>
      )}

      {loading && <div className="loading">Loading students…</div>}
      {error && <div className="error">{error}</div>}
      {!loading && rows.length === 0 && <div className="card empty">No students match.</div>}
      {!loading && rows.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])} /></th>
                <th>Admission</th><th>Name</th><th>Parent</th><th>House</th><th>Kit</th><th>Phone</th><th>Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td><input type="checkbox" checked={selected.includes(s.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, s.id] : selected.filter((id) => id !== s.id))} /></td>
                  <td><button className="btn ghost sm" onClick={() => openDetail(s.id)}>{s.admission_number}</button></td>
                  <td>{s.student_name}</td>
                  <td>{s.parent_name}</td>
                  <td>{s.house_color}</td>
                  <td><span className="badge">{s.kit_status}</span></td>
                  <td>
                    <input className="input" style={{ width: 120 }} defaultValue={s.phone || ''}
                      onBlur={async (e) => { if (e.target.value !== (s.phone || '')) { await adminApi.saveStudent(s.id, { phone: e.target.value || null }); toast('Phone saved'); } }} />
                  </td>
                  <td>{s.is_active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ padding: 12 }}>
            <span className="muted">{meta.total} students</span>
            <button className="btn ghost sm" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>Prev</button>
            <button className="btn ghost sm" onClick={() => load(meta.page + 1)}>Next</button>
          </div>
        </div>
      )}

      {form && (
        <div className="drawer" onClick={() => setForm(null)}>
          <form className="drawer-panel" onClick={(e) => e.stopPropagation()} onSubmit={saveForm}>
            <h3>{form.id ? 'Edit student' : 'Add student'}</h3>
            {Object.keys(emptyForm).map((k) => (
              <label key={k}>{k}<input className="input" value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
            ))}
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn">Save</button>
              <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {drawer && (
        <div className="drawer" onClick={() => setDrawer(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <h3>{drawer.student_name} · {drawer.admission_number}</h3>
            <p>{drawer.address1} {drawer.address2}<br />{drawer.city} {drawer.state} {drawer.zipcode}</p>
            <p>House: {drawer.house_color} · Kit: {drawer.kit_status}</p>
            <label>Catalog override
              <select className="input" value={drawer.individual_override} onChange={(e) => setDrawer({ ...drawer, individual_override: e.target.value })}>
                <option value="default">Default</option>
                <option value="force_show">Force show individual products</option>
                <option value="force_hide">Force hide (kit only)</option>
              </select>
            </label>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn sm" onClick={async () => { await adminApi.saveStudent(drawer.id, { individual_override: drawer.individual_override }); toast('Override saved'); }}>Save override</button>
              <button className="btn ghost sm" onClick={async () => { await adminApi.saveStudent(drawer.id, { kit_status: 'pending' }); toast('Kit reset to pending'); openDetail(drawer.id); load(meta.page); }}>Reset kit status</button>
              <button className="btn ghost sm" onClick={async () => { await adminApi.saveStudent(drawer.id, { is_active: !drawer.is_active }); toast('Login toggled'); openDetail(drawer.id); load(meta.page); }}>{drawer.is_active ? 'Deactivate login' : 'Activate login'}</button>
              <button className="btn danger sm" onClick={async () => { await adminApi.deleteStudent(drawer.id); toast('Deleted'); setDrawer(null); load(meta.page); }}>Delete</button>
            </div>
            <h4>Orders</h4>
            {(drawer.orders || []).length === 0 && <div className="empty">No orders</div>}
            {(drawer.orders || []).map((o) => (
              <div key={o.id}>{o.order_number} · {o.type} · {o.status} · ₹{o.total}</div>
            ))}
          </div>
        </div>
      )}

      {preview && (
        <div className="drawer" onClick={() => setPreview(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px, 100%)' }}>
            <h3>Import preview</h3>
            <p>New {preview.counts.new} · Update {preview.counts.will_update} · Invalid {preview.counts.invalid} · Duplicates in file {preview.counts.duplicate_in_file}</p>
            <table className="table">
              <thead><tr><th>Row</th><th>Admission</th><th>Name</th><th>Status</th></tr></thead>
              <tbody>
                {preview.preview.map((r) => (
                  <tr key={r.rowNumber}>
                    <td>{r.rowNumber}</td>
                    <td>{r.data.admission_number}</td>
                    <td>{r.data.student_name}</td>
                    <td>{r.valid ? 'OK' : r.errors.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.errors.length > 0 && (
              <a className="btn ghost" href={`/api/admin/students/import/errors.csv?previewId=${preview.previewId}`}>Download error report</a>
            )}
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn" onClick={async () => { await adminApi.commitImport(preview.previewId); toast('Import complete'); setPreview(null); load(1); }}>Confirm upsert</button>
              <button className="btn ghost" onClick={() => setPreview(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
