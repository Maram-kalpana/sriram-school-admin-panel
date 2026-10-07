import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { adminApi } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';

export default function Settings() {
  const { me } = useOutletContext();
  const toast = useToast();
  const [s, setS] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', role: 'staff' });
  useEffect(() => {
    adminApi.settings().then((r) => setS(r.data));
    if (me?.role === 'super_admin') adminApi.admins().then((r) => setAdmins(r.data)).catch(() => {});
  }, [me]);
  if (!s) return <div className="page loading">Loading settings…</div>;
  return (
    <div className="page">
      <h2>Settings</h2>
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <label>When to show individual products
          <select className="input" value={s.kit_to_individual_rule} onChange={(e) => setS({ ...s, kit_to_individual_rule: e.target.value })}>
            <option value="after_kit_order">After kit order (default)</option>
            <option value="after_first_login">After first login</option>
          </select>
        </label>
        <label>Second factor at student login
          <select className="input" value={s.require_second_factor} onChange={(e) => setS({ ...s, require_second_factor: e.target.value })}>
            <option value="off">Off</option>
            <option value="zipcode">Zipcode</option>
            <option value="parent_phone">Parent phone (falls back to zipcode if empty)</option>
          </select>
        </label>
        <label>Shipping flat fee<input className="input" value={s.shipping_flat_fee} onChange={(e) => setS({ ...s, shipping_flat_fee: e.target.value })} /></label>
        <label>School name<input className="input" value={s.school_name} onChange={(e) => setS({ ...s, school_name: e.target.value })} /></label>
        <label>School logo URL<input className="input" value={s.school_logo} onChange={(e) => setS({ ...s, school_logo: e.target.value })} /></label>
        <label><input type="checkbox" checked={s.allow_address_edit === 'true'} onChange={(e) => setS({ ...s, allow_address_edit: String(e.target.checked) })} /> Allow students to edit address at checkout</label>
        <label><input type="checkbox" checked={s.allow_kit_reorder === 'true'} onChange={(e) => setS({ ...s, allow_kit_reorder: String(e.target.checked) })} /> Allow kit re-order in individual mode</label>
        <button className="btn" style={{ marginTop: 12 }} onClick={async () => { await adminApi.saveSettings(s); toast('Settings saved'); }}>Save settings</button>
      </div>
      {me?.role === 'super_admin' && (
        <div className="card" style={{ padding: 16 }}>
          <h3>Admin users</h3>
          <form className="row" onSubmit={async (e) => {
            e.preventDefault();
            await adminApi.createAdmin(form);
            toast('Admin created');
            setAdmins((await adminApi.admins()).data);
          }}>
            <input className="input grow" placeholder="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="input grow" placeholder="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">staff</option>
              <option value="super_admin">super_admin</option>
            </select>
            <button className="btn">Add</button>
          </form>
          <table className="table">
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>{a.email}</td><td>{a.role}</td><td>{a.is_active ? 'active' : 'off'}</td>
                  <td><button className="btn ghost sm" onClick={async () => { await adminApi.patchAdmin(a.id, { is_active: !a.is_active }); setAdmins((await adminApi.admins()).data); }}>Toggle</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
