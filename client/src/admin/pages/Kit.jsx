import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';

export default function Kit() {
  const toast = useToast();
  const [kit, setKit] = useState({ name: 'School Kit', description: '', price: 0, is_active: true, items: [], warnings: [] });
  const [products, setProducts] = useState([]);
  useEffect(() => {
    Promise.all([adminApi.kit(), adminApi.products('pageSize=100')]).then(([k, p]) => {
      setProducts(p.data);
      if (k.data) setKit({ ...k.data, items: k.data.items || [], is_active: !!k.data.is_active });
    });
  }, []);

  function addItem(product_id) {
    if (kit.items.some((i) => i.product_id === Number(product_id))) return;
    setKit({
      ...kit,
      items: [...kit.items, { product_id: Number(product_id), quantity: 1, requires_size_selection: true, house_color_auto_match: false }],
    });
  }

  async function save() {
    await adminApi.saveKit({
      name: kit.name,
      description: kit.description,
      image: kit.image || null,
      price: Number(kit.price),
      is_active: !!kit.is_active,
      items: kit.items.map((i) => ({
        product_id: Number(i.product_id),
        quantity: Number(i.quantity),
        requires_size_selection: !!i.requires_size_selection,
        house_color_auto_match: !!i.house_color_auto_match,
      })),
    });
    toast('Kit saved');
    const k = await adminApi.kit();
    if (k.data) setKit({ ...k.data, items: k.data.items || [], is_active: !!k.data.is_active });
  }

  return (
    <div className="page">
      <h2>School Kit</h2>
      {(kit.warnings || []).map((w) => <p key={w} className="badge amber">{w}</p>)}
      <div className="card" style={{ padding: 16 }}>
        <label>Name<input className="input" value={kit.name} onChange={(e) => setKit({ ...kit, name: e.target.value })} /></label>
        <label>Description<textarea className="input" value={kit.description || ''} onChange={(e) => setKit({ ...kit, description: e.target.value })} /></label>
        <label>Bundle price<input className="input" type="number" value={kit.price} onChange={(e) => setKit({ ...kit, price: e.target.value })} /></label>
        <label><input type="checkbox" checked={!!kit.is_active} onChange={(e) => setKit({ ...kit, is_active: e.target.checked })} /> Active</label>
        <h4>Items</h4>
        <select className="input" onChange={(e) => addItem(e.target.value)} defaultValue="">
          <option value="">Add product…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <table className="table">
          <thead><tr><th>Product</th><th>Qty</th><th>Student chooses size</th><th>Auto house color</th><th></th></tr></thead>
          <tbody>
            {kit.items.map((i, idx) => (
              <tr key={idx}>
                <td>{i.name || products.find((p) => p.id === i.product_id)?.name || i.product_id}</td>
                <td><input className="input" type="number" value={i.quantity} onChange={(e) => {
                  const items = [...kit.items]; items[idx] = { ...i, quantity: e.target.value }; setKit({ ...kit, items });
                }} /></td>
                <td><input type="checkbox" checked={!!i.requires_size_selection} onChange={(e) => {
                  const items = [...kit.items]; items[idx] = { ...i, requires_size_selection: e.target.checked }; setKit({ ...kit, items });
                }} /></td>
                <td><input type="checkbox" checked={!!i.house_color_auto_match} onChange={(e) => {
                  const items = [...kit.items]; items[idx] = { ...i, house_color_auto_match: e.target.checked }; setKit({ ...kit, items });
                }} /></td>
                <td><button className="btn danger sm" type="button" onClick={() => setKit({ ...kit, items: kit.items.filter((_, x) => x !== idx) })}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {kit.items.length === 0 && <div className="empty">Add products to the kit</div>}
        <button className="btn" style={{ marginTop: 12 }} onClick={save}>Save kit</button>
      </div>
    </div>
  );
}
