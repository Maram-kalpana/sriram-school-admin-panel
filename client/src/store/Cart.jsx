import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { readCart, writeCart } from './cart.js';

export default function Cart() {
  const [cart, setCart] = useState(readCart());
  function update(next) { writeCart(next); setCart(next); }
  const total = cart.type === 'kit'
    ? (cart.items[0]?.price || 0)
    : cart.items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  return (
    <div>
      <nav className="store-nav"><Link to="/shop">← Shop</Link><Link to="/checkout">Checkout</Link></nav>
      <div className="page">
        <h2>Cart {cart.type ? `(${cart.type})` : ''}</h2>
        {cart.items.length === 0 && <div className="card empty">Cart is empty</div>}
        {cart.items.map((i, idx) => (
          <div className="card" key={idx} style={{ padding: 12, marginBottom: 8 }}>
            <b>{i.name}</b> · {i.sku} · {[i.size, i.color].filter(Boolean).join(' / ')} × {i.quantity}
            <div>₹{i.price}</div>
            {cart.type !== 'kit' && (
              <button className="btn ghost sm" onClick={() => update({ ...cart, items: cart.items.filter((_, x) => x !== idx) })}>Remove</button>
            )}
          </div>
        ))}
        {cart.items.length > 0 && <p><b>Estimated ₹{total}</b></p>}
        {cart.items.length > 0 && <Link className="btn" to="/checkout">Checkout</Link>}
      </div>
    </div>
  );
}
