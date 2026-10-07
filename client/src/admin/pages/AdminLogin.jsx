import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';

export default function AdminLogin() {
  const nav = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('admin@school.local');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await adminApi.login({ email, password });
      toast('Welcome back');
      nav('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={onSubmit}>
        <h2>Admin sign in</h2>
        <p className="muted">Separate console for staff. Students use the store login.</p>
        {error && <p className="error">{error}</p>}
        <label>Email<input className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <div style={{ height: 10 }} />
        <label>Password<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <div style={{ height: 16 }} />
        <button className="btn" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
