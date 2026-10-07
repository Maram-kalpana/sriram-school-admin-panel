import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';

function slugify(t) {
  return String(t || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function ProductForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState('general');
  const [cats, setCats] = useState([]);
  const [p, setP] = useState({
    name: '', slug: '', description: '', category_id: null, brand: '', images: [],
    base_price: 0, compare_at_price: null, tax_percent: 0, status: 'draft',
    is_kit_item: false, visible_individually: true, variants: [],
  });
  const [opt1, setOpt1] = useState({ name: 'Size', values: 'S,M,L' });
  const [opt2, setOpt2] = useState({ name: 'House Color', values: '' });
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.categories().then((r) => setCats(r.data));
    if (id) {
      adminApi.product(id).then((r) => {
        setP({ ...r.data, images: r.data.images || [], variants: r.data.variants || [] });
        setLoading(false);
      }).catch((e) => { setError(e.message); setLoading(false); });
    }
  }, [id]);

  function generateMatrix() {
    const a = opt1.values.split(',').map((v) => v.trim()).filter(Boolean);
    const b = opt2.values.split(',').map((v) => v.trim()).filter(Boolean);
    const left = a.length ? a : [null];
    const right = b.length ? b : [null];
    const variants = [];
    left.forEach((v1) => {
      right.forEach((v2) => {
        const sku = [slugify(p.name || 'SKU'), v1, v2].filter(Boolean).join('-').toUpperCase();
        variants.push({
          sku,
          option1_name: v1 ? opt1.name : null,
          option1_value: v1,
          option2_name: v2 ? opt2.name : null,
          option2_value: v2,
          price_override: null,
          stock_qty: 0,
          low_stock_threshold: 5,
          is_active: true,
        });
      });
    });
    setP({ ...p, variants });
    setTab('variants');
  }

  async function onUpload(e) {
    const files = e.target.files;
    if (!files?.length) return;
    const r = await adminApi.upload(files);
    setP({ ...p, images: [...(p.images || []), ...r.data.urls] });
  }

  async function save(e) {
    e.preventDefault();
    const skus = p.variants.map((v) => v.sku);
    const dup = skus.filter((s, i) => skus.indexOf(s) !== i);
    if (dup.length) { toast(`Duplicate SKUs: ${dup.join(', ')}`); return; }
    const body = {
      ...p,
      category_id: p.category_id ? Number(p.category_id) : null,
      base_price: Number(p.base_price),
      compare_at_price: p.compare_at_price === '' || p.compare_at_price == null ? null : Number(p.compare_at_price),
      tax_percent: Number(p.tax_percent || 0),
      variants: p.variants.map((v) => ({
        ...v,
        id: v.id ? Number(v.id) : undefined,
        stock_qty: Number(v.stock_qty || 0),
        low_stock_threshold: Number(v.low_stock_threshold || 5),
        price_override: v.price_override === '' || v.price_override == null ? null : Number(v.price_override),
      })),
    };
    try {
      const r = await adminApi.saveProduct(id, body);
      toast('Product saved');
      nav(`/admin/products/${r.data.id}`);
    } catch (err) {
      toast(err.message);
    }
  }

  const primary = p.images?.[0];

  if (loading) return <div className="page loading">Loading product…</div>;
  if (error) return <div className="page error">{error}</div>;

  return (
    <form className="page" onSubmit={save}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>{id ? 'Edit product' : 'New product'}</h2>
        <button className="btn">Save</button>
      </div>
      <div className="tabs">
        {['general', 'images', 'pricing', 'variants', 'visibility'].map((t) => (
          <button type="button" key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === 'general' && (
        <div className="card" style={{ padding: 16 }}>
          <label>Name<input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value, slug: p.slug || slugify(e.target.value) })} /></label>
          <label>Slug<input className="input" value={p.slug} onChange={(e) => setP({ ...p, slug: slugify(e.target.value) })} /></label>
          <label>Description<textarea className="input" rows={6} value={p.description || ''} onChange={(e) => setP({ ...p, description: e.target.value })} /></label>
          <label>Category
            <select className="input" value={p.category_id || ''} onChange={(e) => setP({ ...p, category_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">None</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Brand<input className="input" value={p.brand || ''} onChange={(e) => setP({ ...p, brand: e.target.value })} /></label>
          <label>Status
            <select className="input" value={p.status} onChange={(e) => setP({ ...p, status: e.target.value })}>
              <option>draft</option><option>active</option><option>archived</option>
            </select>
          </label>
        </div>
      )}
      {tab === 'images' && (
        <div className="card" style={{ padding: 16 }}>
          <input type="file" multiple accept="image/*" onChange={onUpload} />
          <div className="row" style={{ marginTop: 12 }}>
            {(p.images || []).map((url, i) => (
              <div key={url} style={{ width: 120 }}>
                <img src={url} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, outline: i === 0 ? '3px solid #4f46e5' : '' }} />
                <div className="row">
                  <button type="button" className="btn ghost sm" onClick={() => {
                    const images = [...p.images];
                    const [x] = images.splice(i, 1);
                    images.unshift(x);
                    setP({ ...p, images });
                  }}>Primary</button>
                  <button type="button" className="btn danger sm" onClick={() => setP({ ...p, images: p.images.filter((u) => u !== url) })}>X</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'pricing' && (
        <div className="card" style={{ padding: 16 }}>
          <label>Base price<input className="input" type="number" value={p.base_price} onChange={(e) => setP({ ...p, base_price: e.target.value })} /></label>
          <label>Compare-at<input className="input" type="number" value={p.compare_at_price || ''} onChange={(e) => setP({ ...p, compare_at_price: e.target.value })} /></label>
          <label>Tax %<input className="input" type="number" value={p.tax_percent} onChange={(e) => setP({ ...p, tax_percent: e.target.value })} /></label>
        </div>
      )}
      {tab === 'variants' && (
        <div className="card" style={{ padding: 16 }}>
          <div className="row">
            <label className="grow">Option 1 name<input className="input" value={opt1.name} onChange={(e) => setOpt1({ ...opt1, name: e.target.value })} /></label>
            <label className="grow">Values (comma)<input className="input" value={opt1.values} onChange={(e) => setOpt1({ ...opt1, values: e.target.value })} /></label>
          </div>
          <div className="row">
            <label className="grow">Option 2 name<input className="input" value={opt2.name} onChange={(e) => setOpt2({ ...opt2, name: e.target.value })} /></label>
            <label className="grow">Values<input className="input" value={opt2.values} onChange={(e) => setOpt2({ ...opt2, values: e.target.value })} /></label>
          </div>
          <button type="button" className="btn" style={{ margin: '12px 0' }} onClick={generateMatrix}>Generate variant matrix</button>
          {p.variants.length === 0 && <div className="empty">No variants yet</div>}
          {p.variants.length > 0 && (
            <table className="table">
              <thead><tr><th>SKU</th><th>Opt1</th><th>Opt2</th><th>Price override</th><th>Stock</th><th>Low</th><th>Active</th></tr></thead>
              <tbody>
                {p.variants.map((v, i) => (
                  <tr key={i}>
                    <td><input className="input" value={v.sku} onChange={(e) => { const variants = [...p.variants]; variants[i] = { ...v, sku: e.target.value }; setP({ ...p, variants }); }} /></td>
                    <td>{v.option1_value}</td>
                    <td>{v.option2_value}</td>
                    <td><input className="input" type="number" value={v.price_override ?? ''} onChange={(e) => { const variants = [...p.variants]; variants[i] = { ...v, price_override: e.target.value }; setP({ ...p, variants }); }} /></td>
                    <td><input className="input" type="number" value={v.stock_qty} onChange={(e) => { const variants = [...p.variants]; variants[i] = { ...v, stock_qty: e.target.value }; setP({ ...p, variants }); }} /></td>
                    <td><input className="input" type="number" value={v.low_stock_threshold} onChange={(e) => { const variants = [...p.variants]; variants[i] = { ...v, low_stock_threshold: e.target.value }; setP({ ...p, variants }); }} /></td>
                    <td><input type="checkbox" checked={!!v.is_active} onChange={(e) => { const variants = [...p.variants]; variants[i] = { ...v, is_active: e.target.checked }; setP({ ...p, variants }); }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {tab === 'visibility' && (
        <div className="card" style={{ padding: 16 }}>
          <label><input type="checkbox" checked={!!p.is_kit_item} onChange={(e) => setP({ ...p, is_kit_item: e.target.checked })} /> Include in School Kit</label>
          <div />
          <label><input type="checkbox" checked={!!p.visible_individually} onChange={(e) => setP({ ...p, visible_individually: e.target.checked })} /> Show as individual product</label>
        </div>
      )}
      {primary && <p className="muted">Primary image: {primary}</p>}
    </form>
  );
}
