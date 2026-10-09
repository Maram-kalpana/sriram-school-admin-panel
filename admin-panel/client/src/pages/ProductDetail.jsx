import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import DataTable from '../components/DataTable'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { useSnackbar } from '../context/SnackbarContext'
import { formatDateTime, formatINR } from '../utils/format'
import { getProduct } from '../api/catalog'

export default function ProductDetail() {
  const { id } = useParams()
  const { showToast } = useSnackbar()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProduct(id)
      .then((res) => setData(res.data))
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load', 'error'))
      .finally(() => setLoading(false))
  }, [id, showToast])

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Product" breadcrumbs={[{ label: 'Products', to: '/admin/products' }]} />
        <LoadingSkeleton rows={8} />
      </>
    )
  }

  const p = data.product
  const images = data.images || []
  const variants = data.variants || []
  const movements = data.movements || []
  const sales = data.sales || { qty: 0, revenue: 0, orders: 0 }

  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={p.sku || p.slug}
        breadcrumbs={[{ label: 'Products', to: '/admin/products' }, { label: p.name }]}
        actions={
          <Button component={RouterLink} to={`/admin/products/${id}/edit`} variant="contained">
            Edit
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                {images[0] && (
                  <Box component="img" src={images[0].url} alt="" sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 1 }} />
                )}
                <Box>
                  <StatusBadge status={p.status} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{p.categoryName} · {p.brand || '—'}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>{p.description || 'No description'}</Typography>
                  <Typography sx={{ mt: 1 }}>
                    {formatINR(p.basePrice)} · GST {Number(p.gstRate ?? p.taxPercent)}%
                    {p.hsnCode ? ` · HSN ${p.hsnCode}` : ''}
                    {p.priceIncludesGst ? ' (incl. GST)' : ' (excl. GST)'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Visible individually: {p.visibleIndividually ? 'Yes' : 'No'} · Include in kit: {p.includeInKit !== false ? 'Yes' : 'No'}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Sales</Typography>
              <Typography>Orders: {sales.orders}</Typography>
              <Typography>Units: {sales.qty}</Typography>
              <Typography>Revenue: {formatINR(sales.revenue)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography fontWeight={700} sx={{ mb: 1 }}>Images</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        {images.map((img) => (
          <Box
            key={img.id}
            component="img"
            src={img.url}
            alt=""
            sx={{
              width: 96,
              height: 96,
              objectFit: 'cover',
              borderRadius: 1,
              border: img.isPrimary ? '2px solid' : '1px solid',
              borderColor: img.isPrimary ? 'primary.main' : 'divider',
            }}
          />
        ))}
        {!images.length && <Typography variant="body2" color="text.secondary">No images</Typography>}
      </Stack>

      <Typography fontWeight={700} sx={{ mb: 1 }}>Variants</Typography>
      <DataTable
        columns={[
          { id: 'sku', label: 'SKU', render: (r) => r.sku },
          { id: 'opts', label: 'Options', render: (r) => [r.option1Value, r.option2Value].filter(Boolean).join(' / ') || '—' },
          { id: 'barcode', label: 'Barcode', render: (r) => r.barcode || '—' },
          { id: 'price', label: 'Price', render: (r) => formatINR(r.priceOverride ?? p.basePrice) },
          { id: 'stock', label: 'Stock', render: (r) => r.stockQty },
          { id: 'th', label: 'Low at', render: (r) => r.lowStockThreshold },
          { id: 'st', label: 'Status', render: (r) => <StatusBadge status={r.stockQty === 0 ? 'out' : r.stockQty <= r.lowStockThreshold ? 'low' : 'in stock'} /> },
        ]}
        rows={variants}
        emptyTitle="No variants"
      />

      <Typography fontWeight={700} sx={{ mt: 3, mb: 1 }}>Stock history</Typography>
      <DataTable
        columns={[
          { id: 'createdAt', label: 'When', render: (r) => formatDateTime(r.createdAt) },
          { id: 'sku', label: 'SKU', render: (r) => r.sku },
          { id: 'qty', label: 'Change', render: (r) => (r.changeQty > 0 ? `+${r.changeQty}` : r.changeQty) },
          { id: 'reason', label: 'Reason', render: (r) => r.reason },
          { id: 'note', label: 'Note', render: (r) => r.note || '—' },
        ]}
        rows={movements}
        emptyTitle="No stock movements yet"
      />
    </>
  )
}
