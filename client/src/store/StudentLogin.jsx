import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shopApi } from '../api.js';
import { useToast } from '../components/Toast.jsx';

export default function StudentLogin() {
  const nav = useNavigate();
  const toast = useToast();
  const [boot, setBoot] = useState(null);
  const [admission, setAdmission] = useState('');
  const [second, setSecond] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    shopApi.bootstrap().then((r) => setBoot(r.data));
    shopApi.me().then(() => nav('/shop')).catch(() => {});
  }, [nav]);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await shopApi.login({ admission_number: admission, second_factor: second });
      toast('Welcome');
      nav('/shop');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  const needSecond = boot && boot.require_second_factor && boot.require_second_factor !== 'off';

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h2>{boot?.school_name || 'School Store'}</h2>
        <p className="muted">Enter your admission number to see your kit or shop.</p>
        {error && <p className="error">{error}</p>}
        <label>Admission number<input className="input" value={admission} onChange={(e) => setAdmission(e.target.value)} required /></label>
        {needSecond && (
          <label style={{ marginTop: 10 }}>
            {boot.require_second_factor === 'zipcode' ? 'Zipcode' : 'Parent phone or zipcode'}
            <input className="input" value={second} onChange={(e) => setSecond(e.target.value)} />
          </label>
        )}
        <div style={{ height: 16 }} />
        <button className="btn" disabled={loading}>{loading ? 'Checking…' : 'Continue'}</button>
        <p className="muted" style={{ marginTop: 16 }}><a href="/admin/login">Staff admin login</a></p>
      </form>
    </div>
  );
}
