import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { shopApi } from '../api.js';
import { clearCart, readCart } from './cart.js';
import { useToast } from '../components/Toast.jsx';

export default function Checkout() {
  const nav = useNavigate();
  const toast = useToast();
  const cart = readCart();
  const [me, setMe] = useState(null);
  const [method, setMethod] = useState('pay_at_school');
  const [notes, setNotes] = useState('');
  const [addr, setAddr] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    shopApi.me().then((r) => {
      setMe(r.data);
      setAddr(r.data.student);
    }).catch(() => nav('/'));
  }, [nav]);

  if (!me) return <div className="loading">Loading checkout…</div>;
  if (!cart.items.length) return <div className="page empty">Cart is empty. <Link to="/shop">Shop</Link></div>;

  async function place(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await shopApi.checkout({
        type: cart.type,
        payment_method: method,
        notes,
        address: me.allow_address_edit ? addr : undefined,
        items: cart.items.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id,
          quantity: i.quantity || 1,
        })),
      });
      clearCart();
      toast('Order placed');
      nav(`/confirmation/${r.data.order.id}`);
    } catch (err) {
      toast(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <nav className="store-nav"><Link to="/cart">← Cart</Link></nav>
      <form className="page" onSubmit={place}>
        <h2>Checkout</h2>
        <div className="card" style={{ padding: 16 }}>
          <h3>Delivery address</h3>
          {['student_name', 'address1', 'address2', 'city', 'state', 'zipcode', 'phone'].map((k) => (
            <label key={k}>{k}
              <input className="input" value={addr[k] || ''} disabled={!me.allow_address_edit}
                onChange={(e) => setAddr({ ...addr, [k]: e.target.value })} />
            </label>
          ))}
          {!me.allow_address_edit && <p className="muted">Address is locked. Ask the office to update it.</p>}
        </div>
        <div className="card" style={{ padding: 16, marginTop: 12 }}>
          <h3>Payment</h3>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="pay_at_school">Pay at school</option>
            <option value="cash_on_delivery">Cash on delivery</option>
            <option value="razorpay">Razorpay (stub)</option>
          </select>
          <label>Notes<textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <p>Shipping ₹{me.shipping_flat_fee}</p>
          <button className="btn" disabled={loading}>{loading ? 'Placing…' : 'Place order'}</button>
        </div>
      </form>
    </div>
  );
}
