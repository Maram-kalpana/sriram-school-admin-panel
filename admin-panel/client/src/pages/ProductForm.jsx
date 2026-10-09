import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import PageHeader from '../components/PageHeader'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { useSnackbar } from '../context/SnackbarContext'
import {
  createProduct,
  deleteProductImage,
  getProduct,
  listCategories,
  reorderProductImages,
  updateProduct,
  uploadProductImages,
} from '../api/catalog'

const GST_RATES = [0, 5, 12, 18, 28]

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
  const { showToast } = useSnackbar()
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
    hsnCode: '',
    gstRate: 5,
    priceIncludesGst: true,
    taxPercent: 5,
    visibleIndividually: true,
    includeInKit: true,
    variants: [],
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)

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
          hsnCode: p.hsnCode || '',
          gstRate: Number(p.gstRate ?? p.taxPercent ?? 5),
          priceIncludesGst: p.priceIncludesGst !== false,
          taxPercent: Number(p.gstRate ?? p.taxPercent ?? 5),
          visibleIndividually: p.visibleIndividually,
          includeInKit: p.includeInKit !== false,
          variants: res.data.variants,
        })
        setImages(res.data.images)
      })
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load', 'error'))
      .finally(() => setLoading(false))
  }, [id, isNew, showToast])

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
    const next = matrixPreview.map((row) => ({
      sku: [base, row.option1Value, row.option2Value ? String(row.option2Value).toUpperCase().slice(0, 3) : null]
        .filter(Boolean)
        .join('-'),
      ...row,
      priceOverride: null,
      stockQty: 0,
      lowStockThreshold: 5,
      barcode: '',
      imageUrl: '',
      isActive: true,
    }))
    setForm((f) => ({ ...f, variants: next }))
    showToast(`Generated ${next.length} variants`, 'success')
  }

  function patchVariant(idx, patch) {
    const variants = [...form.variants]
    variants[idx] = { ...variants[idx], ...patch }
    setForm((f) => ({ ...f, variants }))
  }

  async function onSave(e) {
    e?.preventDefault?.()
    setSaving(true)
    try {
      const payload = {
        ...form,
        categoryId: Number(form.categoryId),
        compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
        basePrice: Number(form.basePrice),
        gstRate: Number(form.gstRate),
        taxPercent: Number(form.gstRate),
        hsnCode: form.hsnCode || null,
        variants: form.variants,
      }
      if (isNew) {
        const res = await createProduct(payload)
        showToast('Product created', 'success')
        navigate(`/admin/products/${res.data.product.id}`)
      } else {
        await updateProduct(id, payload)
        showToast('Product saved', 'success')
        navigate(`/admin/products/${id}`)
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Product" breadcrumbs={[{ label: 'Products', to: '/admin/products' }]} />
        <LoadingSkeleton rows={8} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={isNew ? 'Add product' : 'Edit product'}
        breadcrumbs={[
          { label: 'Products', to: '/admin/products' },
          { label: isNew ? 'New' : form.name || 'Edit' },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => navigate(isNew ? '/admin/products' : `/admin/products/${id}`)}>
              Cancel
            </Button>
            <Button variant="contained" disabled={saving} onClick={onSave}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        }
      />

      <Stack spacing={2} component="form" onSubmit={onSave}>
        <Card variant="outlined">
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 2 }}>Basic</Typography>
            <Stack spacing={2} maxWidth={720}>
              <TextField
                label="Name"
                required
                fullWidth
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: isNew ? slugify(e.target.value) : f.slug,
                  }))
                }
              />
              <TextField label="Slug" fullWidth value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} />
              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
              <TextField
                select
                label="Category"
                required
                fullWidth
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
              <TextField label="Brand" fullWidth value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              <TextField
                select
                label="Status"
                fullWidth
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </TextField>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 2 }}>Images</Typography>
            {isNew ? (
              <Typography variant="body2" color="text.secondary">Save the product first, then upload images.</Typography>
            ) : (
              <Stack spacing={2}>
                <Button variant="outlined" component="label" sx={{ alignSelf: 'flex-start' }}>
                  Upload images
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      if (!e.target.files?.length) return
                      try {
                        const res = await uploadProductImages(id, e.target.files)
                        setImages((imgs) => [...imgs, ...res.data.images])
                        showToast('Uploaded', 'success')
                      } catch (err) {
                        showToast(err.response?.data?.message || 'Upload failed', 'error')
                      }
                    }}
                  />
                </Button>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {images.map((img, idx) => (
                    <Box key={img.id} sx={{ width: 140, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                      <Box component="img" src={img.url} alt="" sx={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 1 }} />
                      <Stack spacing={0.5} sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          onClick={async () => {
                            const next = images.map((im, i) => ({ id: im.id, sortOrder: i, isPrimary: im.id === img.id }))
                            await reorderProductImages(id, next)
                            setImages((imgs) => imgs.map((im) => ({ ...im, isPrimary: im.id === img.id })))
                          }}
                        >
                          {img.isPrimary ? 'Primary' : 'Make primary'}
                        </Button>
                        <Button
                          size="small"
                          disabled={idx === 0}
                          onClick={async () => {
                            const next = [...images]
                            ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                            setImages(next)
                            await reorderProductImages(id, next.map((im, i) => ({ id: im.id, sortOrder: i, isPrimary: im.isPrimary })))
                          }}
                        >
                          Move up
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={async () => {
                            await deleteProductImage(id, img.id)
                            setImages((imgs) => imgs.filter((i) => i.id !== img.id))
                          }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 2 }}>Pricing & Tax</Typography>
            <Stack spacing={2} maxWidth={480}>
              <TextField type="number" label="Regular price (₹)" fullWidth value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} />
              <TextField type="number" label="Sale / compare-at price" fullWidth value={form.compareAtPrice} onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))} />
              <TextField label="HSN code" fullWidth value={form.hsnCode} onChange={(e) => setForm((f) => ({ ...f, hsnCode: e.target.value }))} />
              <TextField
                select
                label="GST rate"
                fullWidth
                value={form.gstRate}
                onChange={(e) => setForm((f) => ({ ...f, gstRate: Number(e.target.value), taxPercent: Number(e.target.value) }))}
              >
                {GST_RATES.map((r) => (
                  <MenuItem key={r} value={r}>{r}%</MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={<Switch checked={Boolean(form.priceIncludesGst)} onChange={(e) => setForm((f) => ({ ...f, priceIncludesGst: e.target.checked }))} />}
                label="Price includes GST"
              />
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 2 }}>Variants</Typography>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Option 1 name" value={opt1Name} onChange={(e) => setOpt1Name(e.target.value)} />
                <TextField label="Option 1 values" fullWidth value={opt1Values} onChange={(e) => setOpt1Values(e.target.value)} helperText="Comma-separated" />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Option 2 name" value={opt2Name} onChange={(e) => setOpt2Name(e.target.value)} />
                <TextField label="Option 2 values (optional)" fullWidth value={opt2Values} onChange={(e) => setOpt2Values(e.target.value)} placeholder="Red,Yellow,Green,Blue" />
              </Stack>
              <Button variant="outlined" onClick={generateVariants} sx={{ alignSelf: 'flex-start' }}>
                Generate matrix ({matrixPreview.length})
              </Button>
              {form.variants.map((v, idx) => (
                <Stack key={v.id || v.sku || idx} direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                  <TextField label="SKU" size="small" value={v.sku} onChange={(e) => patchVariant(idx, { sku: e.target.value })} sx={{ minWidth: 160 }} />
                  <Typography variant="caption" sx={{ minWidth: 140 }}>
                    {[v.option1Value, v.option2Value].filter(Boolean).join(' / ')}
                  </Typography>
                  <TextField label="Barcode" size="small" value={v.barcode || ''} onChange={(e) => patchVariant(idx, { barcode: e.target.value })} />
                  <TextField
                    type="number"
                    label="Price override"
                    size="small"
                    value={v.priceOverride ?? ''}
                    onChange={(e) => patchVariant(idx, { priceOverride: e.target.value === '' ? null : Number(e.target.value) })}
                    sx={{ width: 130 }}
                  />
                  <TextField
                    type="number"
                    label="Stock"
                    size="small"
                    value={v.stockQty ?? 0}
                    disabled={Boolean(v.id)}
                    helperText={v.id ? 'Use Inventory' : ''}
                    onChange={(e) => patchVariant(idx, { stockQty: Number(e.target.value) })}
                    sx={{ width: 110 }}
                  />
                  <TextField
                    type="number"
                    label="Low stock"
                    size="small"
                    value={v.lowStockThreshold ?? 5}
                    onChange={(e) => patchVariant(idx, { lowStockThreshold: Number(e.target.value) })}
                    sx={{ width: 110 }}
                  />
                  <FormControlLabel
                    control={<Switch checked={v.isActive !== false} onChange={(e) => patchVariant(idx, { isActive: e.target.checked })} />}
                    label="Active"
                  />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 1 }}>Stock</Typography>
            <Typography variant="body2" color="text.secondary">
              Initial stock can be set on new variants. Existing stock is managed on the Inventory page (restock, adjust, bulk Excel).
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 2 }}>Visibility</Typography>
            <Stack>
              <FormControlLabel
                control={<Switch checked={Boolean(form.visibleIndividually)} onChange={(e) => setForm((f) => ({ ...f, visibleIndividually: e.target.checked }))} />}
                label="Show to students as individual product"
              />
              <FormControlLabel
                control={<Switch checked={Boolean(form.includeInKit)} onChange={(e) => setForm((f) => ({ ...f, includeInKit: e.target.checked }))} />}
                label="Include in kit"
              />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </>
  )
}
