import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { adminApi } from '../api.js';

const links = [
  ['/', 'Dashboard'],
  ['/students', 'Students'],
  ['/products', 'Products'],
  ['/inventory', 'Inventory'],
  ['/categories', 'Categories'],
  ['/kit', 'School Kit'],
  ['/orders', 'Orders'],
  ['/settings', 'Settings'],
];

export default function AdminLayout() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    adminApi.me().then((r) => setMe(r.data)).catch(() => nav('/admin/login'));
  }, [nav]);

  if (!me && !err) return <div className="loading">Loading admin…</div>;

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <h1>School Admin</h1>
        {links.map(([to, label]) => (
          <NavLink key={to} to={`/admin${to === '/' ? '' : to}`} end={to === '/'}>
            {label}
          </NavLink>
        ))}
      </aside>
      <div>
        <header className="topbar">
          <strong>Indigo console</strong>
          <div className="row">
            <span className="muted">{me?.email} · {me?.role}</span>
            <button className="btn ghost sm" onClick={async () => { await adminApi.logout(); nav('/admin/login'); }}>Logout</button>
          </div>
        </header>
        <Outlet context={{ me }} />
      </div>
    </div>
  );
}
