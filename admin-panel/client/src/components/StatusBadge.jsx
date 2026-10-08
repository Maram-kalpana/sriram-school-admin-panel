import { Chip } from '@mui/material'

const MAP = {
  pending: { label: 'Pending', color: 'warning' },
  ordered: { label: 'Ordered', color: 'success' },
  draft: { label: 'Draft', color: 'default' },
  active: { label: 'Active', color: 'success' },
  archived: { label: 'Archived', color: 'default' },
  placed: { label: 'Placed', color: 'info' },
  confirmed: { label: 'Confirmed', color: 'primary' },
  packed: { label: 'Packed', color: 'secondary' },
  shipped: { label: 'Shipped', color: 'info' },
  delivered: { label: 'Delivered', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
  returned: { label: 'Returned', color: 'warning' },
  paid: { label: 'Paid', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
  refunded: { label: 'Refunded', color: 'warning' },
  partially_refunded: { label: 'Partial refund', color: 'warning' },
  'in stock': { label: 'In stock', color: 'success' },
  low: { label: 'Low', color: 'warning' },
  out: { label: 'Out', color: 'error' },
  kit: { label: 'Kit', color: 'primary' },
  individual: { label: 'Individual', color: 'secondary' },
  success: { label: 'Success', color: 'success' },
  initiated: { label: 'Initiated', color: 'info' },
}

export default function StatusBadge({ status, label, size = 'small' }) {
  const key = String(status || '').toLowerCase()
  const cfg = MAP[key] || { label: label || status || '—', color: 'default' }
  return (
    <Chip
      size={size}
      label={label || cfg.label}
      color={cfg.color}
      variant="filled"
      sx={{ textTransform: 'capitalize' }}
    />
  )
}
