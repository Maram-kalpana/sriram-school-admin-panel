import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import PageHeader from '../components/PageHeader'
import LoadingSkeleton from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import { useSnackbar } from '../context/SnackbarContext'
import { formatINR } from '../utils/format'
import { getKit, saveKit } from '../api/admin'
import { listProducts } from '../api/catalog'
import api from '../api/client'

export default function Kit() {
  const { showToast } = useSnackbar()
  const [kit, setKit] = useState({ name: 'School Kit', description: '', price: 2499, isActive: true, imageUrl: null })
  const [items, setItems] = useState([])
  const [warnings, setWarnings] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [kitRes, prodRes] = await Promise.all([
        getKit(),
        listProducts({ page: 1, pageSize: 100, status: 'active' }),
      ])
      if (kitRes.data.kit) setKit(kitRes.data.kit)
      setItems(kitRes.data.items || [])
      setWarnings(kitRes.data.warnings || [])
      setProducts(prodRes.data.items || [])
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load kit', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function onSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveKit({
        name: kit.name,
        description: kit.description || '',
        price: Number(kit.price),
        isActive: kit.isActive,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          studentPicksSize: Boolean(i.studentPicksSize),
          autoMatchHouseColor: Boolean(i.autoMatchHouseColor),
        })),
      })
      showToast('Kit saved', 'success')
      load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function onUploadImage(file) {
    if (!file) return
    const form = new FormData()
    form.append('image', file)
    try {
      const { data } = await api.post('/admin/kit/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setKit((k) => ({ ...k, imageUrl: data.data.imageUrl }))
      showToast('Image uploaded', 'success')
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed', 'error')
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="School Kit" subtitle="Bundle products offered as a kit to students." />
        <LoadingSkeleton rows={8} />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="School Kit"
        subtitle="Bundle products, set price, and size/house-color rules."
        actions={
          <Button variant="contained" disabled={saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save kit'}
          </Button>
        }
      />

      {warnings.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Out-of-stock variants in kit: {warnings.map((w) => w.productName).join(', ')}
        </Alert>
      )}

      <Box component="form" onSubmit={onSave}>
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={600} sx={{ mb: 2 }}>Kit details</Typography>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Name"
                    fullWidth
                    required
                    value={kit.name}
                    onChange={(e) => setKit((k) => ({ ...k, name: e.target.value }))}
                  />
                  <TextField
                    label="Bundle price (₹)"
                    type="number"
                    fullWidth
                    required
                    value={kit.price}
                    onChange={(e) => setKit((k) => ({ ...k, price: e.target.value }))}
                    helperText={formatINR(kit.price)}
                  />
                </Stack>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  minRows={2}
                  value={kit.description || ''}
                  onChange={(e) => setKit((k) => ({ ...k, description: e.target.value }))}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={kit.isActive}
                      onChange={(e) => setKit((k) => ({ ...k, isActive: e.target.checked }))}
                    />
                  }
                  label="Active"
                />
                <Stack direction="row" spacing={2} alignItems="center">
                  {kit.imageUrl && (
                    <Box
                      component="img"
                      src={kit.imageUrl}
                      alt="Kit"
                      sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                    />
                  )}
                  <Button variant="outlined" component="label">
                    Upload image
                    <input hidden type="file" accept="image/*" onChange={(e) => onUploadImage(e.target.files?.[0])} />
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography fontWeight={600}>Kit items</Typography>
                <Button
                  startIcon={<AddOutlinedIcon />}
                  size="small"
                  disabled={!products.length}
                  onClick={() => {
                    if (!products[0]) return
                    setItems((list) => [
                      ...list,
                      {
                        productId: products[0].id,
                        productName: products[0].name,
                        quantity: 1,
                        studentPicksSize: true,
                        autoMatchHouseColor: false,
                      },
                    ])
                  }}
                >
                  Add product
                </Button>
              </Stack>

              {!items.length && (
                <EmptyState title="No kit items" description="Add products that belong in the school kit." />
              )}

              <Stack spacing={1.5}>
                {items.map((item, idx) => (
                  <Stack
                    key={idx}
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    alignItems={{ md: 'center' }}
                    sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                  >
                    <TextField
                      select
                      size="small"
                      label="Product"
                      value={item.productId}
                      sx={{ flex: 2, minWidth: 180 }}
                      onChange={(e) => {
                        const p = products.find((x) => String(x.id) === e.target.value)
                        const next = [...items]
                        next[idx] = { ...item, productId: Number(e.target.value), productName: p?.name }
                        setItems(next)
                      }}
                    >
                      {products.map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      size="small"
                      type="number"
                      label="Qty"
                      value={item.quantity}
                      sx={{ width: 100 }}
                      inputProps={{ min: 1 }}
                      onChange={(e) => {
                        const next = [...items]
                        next[idx] = { ...item, quantity: Number(e.target.value) }
                        setItems(next)
                      }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={item.studentPicksSize}
                          onChange={(e) => {
                            const next = [...items]
                            next[idx] = { ...item, studentPicksSize: e.target.checked }
                            setItems(next)
                          }}
                        />
                      }
                      label="Student picks size"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={item.autoMatchHouseColor}
                          onChange={(e) => {
                            const next = [...items]
                            next[idx] = { ...item, autoMatchHouseColor: e.target.checked }
                            setItems(next)
                          }}
                        />
                      }
                      label="Auto-match house color"
                    />
                    <IconButton
                      color="error"
                      onClick={() => setItems((list) => list.filter((_, i) => i !== idx))}
                      aria-label="Remove item"
                    >
                      <DeleteOutlinedIcon />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </>
  )
}
