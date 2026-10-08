import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  createProduct,
  deleteProductImage,
  getProduct,
  listCategories,
  reorderProductImages,
  updateProduct,
  uploadProductImages,
} from '../api/catalog'

const TABS = ['General', 'Images', 'Pricing', 'Variants', 'Visibility']

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function ProductForm() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [categories, setCategories] = useState([])
  const [images, setImages] = useState([])
  const [opt1Name, setOpt1Name] = useState('Size')
  const [opt1Values, setOpt1Values] = useState('S,M,L,XL')
  const [opt2Name, setOpt2Name] = useState('Color')
  const [opt2Values, setOpt2Values] = useState('')
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    categoryId: '',
    brand: '',
    status: 'draft',
    basePrice: 0,
    compareAtPrice: '',
    taxPercent: 5,
    visibleIndividually: true,
    variants: [],
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listCategories().then((r) => {
      setCategories(r.data.items)
      if (isNew && r.data.items[0]) {
        setForm((f) => ({ ...f, categoryId: String(r.data.items[0].id) }))
      }
    })
  }, [isNew])

  useEffect(() => {
    if (isNew) return
    getProduct(id)
      .then((res) => {
        const p = res.data.product
        setForm({
          name: p.name,
          slug: p.slug,
          description: p.description || '',
          categoryId: String(p.categoryId),
          brand: p.brand || '',
          status: p.status,
          basePrice: p.basePrice,
          compareAtPrice: p.compareAtPrice ?? '',
          taxPercent: p.taxPercent,
          visibleIndividually: p.visibleIndividually,
          variants: res.data.variants,
        })
        setImages(res.data.images)
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load'))
  }, [id, isNew])

  const matrixPreview = useMemo(() => {
    const v1 = opt1Values.split(',').map((x) => x.trim()).filter(Boolean)
    const v2 = opt2Values.split(',').map((x) => x.trim()).filter(Boolean)
    const rows = []
    for (const a of v1) {
      if (!v2.length) {
        rows.push({ option1Name: opt1Name, option1Value: a, option2Name: null, option2Value: null })
      } else {
        for (const b of v2) {
          rows.push({
            option1Name: opt1Name,
            option1Value: a,
            option2Name: opt2Name,
            option2Value: b,
          })
        }
      }
    }
    return rows
  }, [opt1Name, opt1Values, opt2Name, opt2Values])

  function generateVariants() {
    const base = slugify(form.name || 'SKU').toUpperCase().replace(/-/g, '').slice(0, 12)
    const next = matrixPreview.map((row) => {
      const parts = [base, row.option1Value]
      if (row.option2Value) parts.push(String(row.option2Value).toUpperCase().slice(0, 3))
      return {
        sku: parts.join('-'),
        ...row,
        priceOverride: null,
        stockQty: 0,
        lowStockThreshold: 5,
        isActive: true,
      }
    })
    setForm((f) => ({ ...f, variants: next }))
    toast.success(`Generated ${next.length} variants`)
  }

  async function onSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        categoryId: Number(form.categoryId),
        compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
        basePrice: Number(form.basePrice),
        taxPercent: Number(form.taxPercent),
        variants: form.variants,
      }
      if (isNew) {
        const res = await createProduct(payload)
        toast.success('Product created')
        navigate(`/admin/products/${res.data.product.id}`)
      } else {
        await updateProduct(id, payload)
        toast.success('Product saved')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/products" className="text-sm text-indigo-600">← Products</Link>
          <h1 className="text-2xl font-bold">{isNew ? 'Add product' : 'Edit product'}</h1>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(i)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === i ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={onSave} className="rounded-xl border bg-white p-4">
        {tab === 0 && (
          <div className="grid max-w-2xl gap-3">
            <label className="text-sm">
              Name
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: isNew ? slugify(e.target.value) : f.slug,
                  }))
                }
                required
              />
            </label>
            <label className="text-sm">
              Slug
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
              />
            </label>
            <label className="text-sm">
              Description
              <textarea
                className="mt-1 w-full rounded-lg border px-3 py-2"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              Category
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                required
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Brand
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              Status
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
        )}

        {tab === 1 && (
          <div className="space-y-3">
            {isNew ? (
              <p className="text-sm text-slate-500">Save the product first, then upload images.</p>
            ) : (
              <>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    if (!e.target.files?.length) return
                    try {
                      const res = await uploadProductImages(id, e.target.files)
                      setImages((imgs) => [...imgs, ...res.data.images])
                      toast.success('Uploaded')
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Upload failed')
                    }
                  }}
                />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((img, idx) => (
                    <div key={img.id} className="rounded-lg border p-2">
                      <img src={img.url} alt="" className="h-24 w-full rounded object-cover" />
                      <div className="mt-2 flex flex-wrap gap-1 text-xs">
                        <button
                          type="button"
                          className="text-indigo-600"
                          onClick={async () => {
                            const next = images.map((im, i) => ({
                              id: im.id,
                              sortOrder: i,
                              isPrimary: im.id === img.id,
                            }))
                            await reorderProductImages(id, next)
                            setImages((imgs) =>
                              imgs.map((im) => ({ ...im, isPrimary: im.id === img.id }))
                            )
                            toast.success('Primary set')
                          }}
                        >
                          {img.isPrimary ? 'Primary' : 'Make primary'}
                        </button>
                        <button
                          type="button"
                          className="text-slate-600"
                          disabled={idx === 0}
                          onClick={async () => {
                            const next = [...images]
                            ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                            setImages(next)
                            await reorderProductImages(
                              id,
                              next.map((im, i) => ({ id: im.id, sortOrder: i, isPrimary: im.isPrimary }))
                            )
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="text-red-600"
                          onClick={async () => {
                            await deleteProductImage(id, img.id)
                            setImages((imgs) => imgs.filter((i) => i.id !== img.id))
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 2 && (
          <div className="grid max-w-md gap-3">
            <label className="text-sm">
              Base price
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form.basePrice}
                onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              Compare-at price
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form.compareAtPrice}
                onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              Tax %
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={form.taxPercent}
                onChange={(e) => setForm((f) => ({ ...f, taxPercent: e.target.value }))}
              />
            </label>
          </div>
        )}

        {tab === 3 && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Option 1 name
                <input className="mt-1 w-full rounded-lg border px-3 py-2" value={opt1Name} onChange={(e) => setOpt1Name(e.target.value)} />
              </label>
              <label className="text-sm">
                Option 1 values (comma-separated)
                <input className="mt-1 w-full rounded-lg border px-3 py-2" value={opt1Values} onChange={(e) => setOpt1Values(e.target.value)} />
              </label>
              <label className="text-sm">
                Option 2 name
                <input className="mt-1 w-full rounded-lg border px-3 py-2" value={opt2Name} onChange={(e) => setOpt2Name(e.target.value)} />
              </label>
              <label className="text-sm">
                Option 2 values (optional)
                <input className="mt-1 w-full rounded-lg border px-3 py-2" value={opt2Values} onChange={(e) => setOpt2Values(e.target.value)} placeholder="Red,Yellow,Green,Blue" />
              </label>
            </div>
            <button type="button" onClick={generateVariants} className="rounded-lg border px-3 py-2 text-sm">
              Generate variant matrix ({matrixPreview.length})
            </button>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2">Options</th>
                    <th className="px-2 py-2">Price override</th>
                    <th className="px-2 py-2">Stock</th>
                    <th className="px-2 py-2">Threshold</th>
                    <th className="px-2 py-2">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {form.variants.map((v, idx) => (
                    <tr key={v.id || v.sku || idx} className="border-t">
                      <td className="px-2 py-1">
                        <input
                          className="w-40 rounded border px-2 py-1"
                          value={v.sku}
                          onChange={(e) => {
                            const variants = [...form.variants]
                            variants[idx] = { ...v, sku: e.target.value }
                            setForm((f) => ({ ...f, variants }))
                          }}
                        />
                      </td>
                      <td className="px-2 py-1 text-xs">
                        {v.option1Name}: {v.option1Value}
                        {v.option2Value ? ` / ${v.option2Name}: ${v.option2Value}` : ''}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className="w-24 rounded border px-2 py-1"
                          value={v.priceOverride ?? ''}
                          onChange={(e) => {
                            const variants = [...form.variants]
                            variants[idx] = {
                              ...v,
                              priceOverride: e.target.value === '' ? null : Number(e.target.value),
                            }
                            setForm((f) => ({ ...f, variants }))
                          }}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className="w-20 rounded border px-2 py-1"
                          value={v.stockQty ?? 0}
                          disabled={Boolean(v.id)}
                          title={v.id ? 'Use Inventory to change stock' : ''}
                          onChange={(e) => {
                            const variants = [...form.variants]
                            variants[idx] = { ...v, stockQty: Number(e.target.value) }
                            setForm((f) => ({ ...f, variants }))
                          }}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className="w-20 rounded border px-2 py-1"
                          value={v.lowStockThreshold ?? 5}
                          onChange={(e) => {
                            const variants = [...form.variants]
                            variants[idx] = { ...v, lowStockThreshold: Number(e.target.value) }
                            setForm((f) => ({ ...f, variants }))
                          }}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="checkbox"
                          checked={v.isActive !== false}
                          onChange={(e) => {
                            const variants = [...form.variants]
                            variants[idx] = { ...v, isActive: e.target.checked }
                            setForm((f) => ({ ...f, variants }))
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 4 && (
          <label className="flex max-w-lg items-start gap-3 rounded-lg border p-4 text-sm">
            <input
              type="checkbox"
              checked={form.visibleIndividually}
              onChange={(e) => setForm((f) => ({ ...f, visibleIndividually: e.target.checked }))}
            />
            <span>
              <strong>Visible as individual product</strong>
              <br />
              When unchecked, students never see this as a single item after kit stage.
            </span>
          </label>
        )}
      </form>
    </div>
  )
}
