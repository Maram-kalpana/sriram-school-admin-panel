import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { CardGridSkeleton } from '../components/LoadingSkeleton'
import usePaginatedList from '../hooks/usePaginatedList'
import { useSnackbar } from '../context/SnackbarContext'
import { formatINR, formatNumber, formatDateTime } from '../utils/format'
import {
  adjustStock,
  bulkStockCommit,
  bulkStockPreview,
  listInventory,
  listMovements,
} from '../api/admin'
import api from '../api/client'

export default function Inventory() {
  const { showToast } = useSnackbar()
  const [filters, setFilters] = useState({ search: '', stockFilter: '' })
  const [kpis, setKpis] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [history, setHistory] = useState(null)
  const [bulkPreview, setBulkPreview] = useState(null)
  const [bulkFile, setBulkFile] = useState(null)
  const [inline, setInline] = useState({})

  const fetcher = useMemo(() => (params) => listInventory(params), [])
  const { items, pagination, loading, error, page, pageSize, setPage, setPageSize, reload } =
    usePaginatedList(fetcher, filters)

  useEffect(() => {
    api
      .get('/admin/inventory/summary')
      .then((r) => setKpis(r.data.data))
      .catch(() => {})
  }, [items])

  async function submitAdjust(e) {
    e.preventDefault()
    try {
      await adjustStock(dialog.id, {
        mode: dialog.mode,
        quantity: Number(dialog.quantity),
        note: dialog.note,
      })
      showToast('Stock updated', 'success')
      setDialog(null)
      reload()
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error')
    }
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Variant stock, restock, adjustments, and bulk Excel."
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" href="/api/admin/inventory/export?format=csv">Export CSV</Button>
            <Button variant="outlined" href="/api/admin/inventory/export?format=xlsx">Export Excel</Button>
            <Button variant="outlined" href="/api/admin/inventory/low-stock-report">Low-stock report</Button>
            <Button variant="contained" component="label">
              Bulk Excel
              <input
                hidden
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setBulkFile(file)
                  try {
                    const res = await bulkStockPreview(file)
                    setBulkPreview(res.data)
                  } catch (err) {
                    showToast(err.response?.data?.message || 'Preview failed', 'error')
                  }
                }}
              />
            </Button>
          </Stack>
        }
      />

      {!kpis ? (
        <CardGridSkeleton count={5} />
      ) : (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}><StatCard title="Total SKUs" value={formatNumber(kpis.totalSkus)} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}><StatCard title="Units in stock" value={formatNumber(kpis.unitsInStock)} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}><StatCard title="Stock value" value={formatINR(kpis.stockValue)} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}><StatCard title="Low stock" value={kpis.lowStock} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}><StatCard title="Out of stock" value={kpis.outOfStock} /></Grid>
        </Grid>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <TextField
          placeholder="Search SKU / product"
          fullWidth
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <TextField
          select
          label="Stock"
          value={filters.stockFilter}
          onChange={(e) => setFilters((f) => ({ ...f, stockFilter: e.target.value }))}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="low">Low</MenuItem>
          <MenuItem value="out">Out of stock</MenuItem>
        </TextField>
      </Stack>

      <DataTable
        columns={[
          { id: 'productName', label: 'Product', render: (r) => r.productName },
          { id: 'sku', label: 'SKU', render: (r) => r.sku },
          { id: 'opts', label: 'Options', render: (r) => [r.option1Value, r.option2Value].filter(Boolean).join(' / ') || '—' },
          {
            id: 'stockQty',
            label: 'Qty',
            width: 140,
            render: (r) => (
              <TextField
                size="small"
                type="number"
                value={inline[r.id] ?? r.stockQty}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setInline((s) => ({ ...s, [r.id]: e.target.value }))}
                onBlur={async (e) => {
                  const qty = Number(e.target.value)
                  if (qty === r.stockQty || Number.isNaN(qty)) return
                  try {
                    await adjustStock(r.id, { mode: 'set', quantity: qty, note: 'Inline qty edit' })
                    showToast('Qty saved', 'success')
                    reload()
                  } catch (err) {
                    showToast(err.response?.data?.message || 'Failed', 'error')
                  }
                }}
                sx={{ width: 90 }}
              />
            ),
          },
          { id: 'th', label: 'Threshold', render: (r) => r.lowStockThreshold },
          { id: 'status', label: 'Status', render: (r) => <StatusBadge status={r.statusBadge === 'ok' ? 'in stock' : r.statusBadge} /> },
          {
            id: 'actions',
            label: '',
            align: 'right',
            render: (r) => (
              <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
                <Button size="small" onClick={() => setDialog({ id: r.id, mode: 'restock', quantity: 10, note: '', sku: r.sku })}>Restock</Button>
                <Button size="small" onClick={() => setDialog({ id: r.id, mode: 'adjust', quantity: -1, note: '', sku: r.sku })}>Adjust</Button>
                <Button
                  size="small"
                  onClick={async () => {
                    const res = await listMovements(r.id)
                    setHistory({ sku: r.sku, items: res.data.items })
                  }}
                >
                  History
                </Button>
              </Stack>
            ),
          },
        ]}
        rows={items}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        total={pagination.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        emptyTitle="No variants"
      />

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <form onSubmit={submitAdjust}>
          <DialogTitle sx={{ textTransform: 'capitalize' }}>{dialog?.mode} · {dialog?.sku}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                type="number"
                label="Quantity"
                required
                fullWidth
                value={dialog?.quantity ?? ''}
                onChange={(e) => setDialog((d) => ({ ...d, quantity: e.target.value }))}
              />
              <TextField
                label="Reason"
                required
                fullWidth
                value={dialog?.note ?? ''}
                onChange={(e) => setDialog((d) => ({ ...d, note: e.target.value }))}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Drawer anchor="right" open={Boolean(history)} onClose={() => setHistory(null)}>
        <Stack sx={{ width: { xs: 320, sm: 420 }, p: 2 }} spacing={1}>
          <Typography fontWeight={700}>Movements · {history?.sku}</Typography>
          {(history?.items || []).map((m) => (
            <Stack key={m.id} direction="row" justifyContent="space-between" sx={{ borderBottom: 1, borderColor: 'divider', py: 1 }}>
              <Typography variant="body2">
                {m.changeQty > 0 ? '+' : ''}{m.changeQty} · {m.reason}
                <br />
                <Typography component="span" variant="caption" color="text.secondary">
                  {m.note || '—'} · {m.adminName || 'system'} · {formatDateTime(m.createdAt)}
                </Typography>
              </Typography>
            </Stack>
          ))}
          {!history?.items?.length && <Typography variant="body2" color="text.secondary">No movements</Typography>}
        </Stack>
      </Drawer>

      <Dialog open={Boolean(bulkPreview)} onClose={() => setBulkPreview(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk stock preview</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Valid {bulkPreview?.counts?.valid} / Invalid {bulkPreview?.counts?.invalid}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkPreview(null)}>Close</Button>
          <Button
            variant="contained"
            onClick={async () => {
              const res = await bulkStockCommit(bulkFile)
              showToast(`Updated ${res.data.updated}`, 'success')
              setBulkPreview(null)
              reload()
            }}
          >
            Commit
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
