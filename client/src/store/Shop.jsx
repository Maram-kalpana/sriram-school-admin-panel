import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { shopApi } from '../api.js';
import { readCart, writeCart } from './cart.js';
import { useToast } from '../components/Toast.jsx';

function StoreNav({ count }) {
  return (
    <nav className="store-nav">
      <Link to="/shop"><b>School Store</b></Link>
      <div className="row">
        <Link to="/orders">My orders</Link>
        <Link className="btn sm" to="/cart">Cart ({count})</Link>
      </div>
    </nav>
  );
}

export default function Shop() {
  const nav = useNavigate();
  const toast = useToast();
  const [cat, setCat] = useState(null);
  const [error, setError] = useState('');
  const [picks, setPicks] = useState({});
  const [count, setCount] = useState(readCart().items.length);

  useEffect(() => {
    shopApi.catalog().then((r) => {
      setCat(r.data);
      const next = {};
      (r.data.kit?.items || []).forEach((item) => {
        if (item.auto_variant) next[item.product_id] = item.auto_variant.id;
      });
      setPicks(next);
    }).catch((e) => {
      if (e.status === 401) nav('/');
      else setError(e.message);
    });
  }, [nav]);

  if (error) return <div className="error">{error}</div>;
  if (!cat) return <div className="loading">Loading catalog…</div>;
  const s = cat.student;

  function addIndividual(product, variantId, qty = 1) {
    const variant = product.variants.find((v) => v.id === Number(variantId));
    if (!variant || !variant.in_stock) { toast('That size/color is out of stock'); return; }
    const cart = { type: 'individual', items: [...readCart().items] };
    if (readCart().type === 'kit') cart.items = [];
    cart.items.push({
      product_id: product.id,
      variant_id: variant.id,
      quantity: qty,
      name: product.name,
      sku: variant.sku,
      size: variant.option1_value,
      color: variant.option2_value,
      price: variant.price_override ?? product.base_price,
    });
    writeCart(cart);
    setCount(cart.items.length);
    toast('Added to cart');
  }

  function addKit() {
    const items = (cat.kit.items || []).map((item) => {
      let variantId = picks[item.product_id];
      if (item.house_color_auto_match && item.auto_variant) variantId = item.auto_variant.id;
      const variant = item.variants.find((v) => v.id === Number(variantId));
      if (!variant) throw new Error(`Choose a size for ${item.name}`);
      if (!variant.in_stock) throw new Error(`${item.name} is out of stock`);
      return {
        product_id: item.product_id,
        variant_id: variant.id,
        quantity: item.quantity,
        name: item.name,
        sku: variant.sku,
        size: variant.option1_value,
        color: variant.option2_value,
        price: cat.kit.price,
      };
    });
    writeCart({ type: 'kit', items });
    setCount(items.length);
    toast('Kit added — go to checkout');
    nav('/cart');
  }

  return (
    <div>
      <StoreNav count={count} />
      <div className="page">
        <div className="banner">
          Welcome {s.student_name} · Admission {s.admission_number} · House {s.house_color}
          <div className="muted" style={{ color: '#c7d2fe' }}>Mode: {cat.mode === 'kit' ? 'School kit first' : 'Individual products'}</div>
        </div>
        {cat.mode === 'kit' && cat.kit && (
          <div className="card" style={{ padding: 16, marginTop: 16 }}>
            <h2>{cat.kit.name} · ₹{cat.kit.price}</h2>
            <p>{cat.kit.description}</p>
            {cat.kit.items.map((item) => (
              <div key={item.id} style={{ marginBottom: 12 }}>
                <b>{item.name}</b> × {item.quantity}
                {item.house_color_auto_match && item.auto_variant && (
                  <div className="muted">House color locked: {item.auto_variant.option2_value || item.auto_variant.option1_value}</div>
                )}
                {item.requires_size_selection && (
                  <select className="input" value={picks[item.product_id] || ''} onChange={(e) => setPicks({ ...picks, [item.product_id]: e.target.value })}>
                    <option value="">Choose size</option>
                    {item.variants.filter((v) => !item.house_color_auto_match || String(v.option2_value || '').toLowerCase() === String(s.house_color).toLowerCase() || !v.option2_value).map((v) => (
                      <option key={v.id} value={v.id} disabled={!v.in_stock}>
                        {[v.option1_value, v.option2_value].filter(Boolean).join(' / ')} {v.in_stock ? '' : '(out of stock)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
            <button className="btn" onClick={() => { try { addKit(); } catch (e) { toast(e.message); } }}>Order this kit</button>
          </div>
        )}
        {cat.mode === 'individual' && (
          <>
            {cat.kit && cat.allow_kit_reorder && (
              <p><button className="btn ghost" onClick={() => { try { addKit(); } catch (e) { toast(e.message); } }}>Re-order school kit (₹{cat.kit.price})</button></p>
            )}
            <div className="product-grid">
              {cat.products.map((p) => (
                <div className="card product-card" key={p.id}>
                  {p.images?.[0] ? <img src={p.images[0]} alt="" /> : <div className="thumb" />}
                  <h3>{p.name}</h3>
                  <p>₹{p.base_price}</p>
                  <select className="input" id={`v-${p.id}`}>
                    {p.variants.map((v) => (
                      <option key={v.id} value={v.id} disabled={!v.in_stock}>
                        {[v.option1_value, v.option2_value].filter(Boolean).join(' / ') || v.sku} {v.in_stock ? '' : '(out of stock)'}
                      </option>
                    ))}
                  </select>
                  <button className="btn sm" style={{ marginTop: 8 }} onClick={() => addIndividual(p, document.getElementById(`v-${p.id}`).value)}>Add</button>
                </div>
              ))}
            </div>
            {cat.products.length === 0 && <div className="card empty">No individual products available</div>}
          </>
        )}
      </div>
    </div>
  );
}
