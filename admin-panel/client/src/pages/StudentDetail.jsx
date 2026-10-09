import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
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
import StatusBadge from '../components/StatusBadge'
import DataTable from '../components/DataTable'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { useSnackbar } from '../context/SnackbarContext'
import { formatDateTime, formatINR } from '../utils/format'
import { getStudent, updateStudentControls } from '../api/students'

export default function StudentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useSnackbar()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await getStudent(id)
      setData(res.data)
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load student', 'error')
      navigate('/admin/students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  async function patchControls(patch) {
    try {
      await updateStudentControls(id, patch)
      showToast('Updated', 'success')
      load()
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error')
    }
  }

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Student" breadcrumbs={[{ label: 'Students', to: '/admin/students' }, { label: '…' }]} />
        <LoadingSkeleton rows={6} />
      </>
    )
  }

  const s = data.student

  return (
    <>
      <PageHeader
        title={`${s.studentName} (${s.admissionNumber})`}
        subtitle={`${s.parentName} · ${s.houseColor} · ${s.city}`}
        breadcrumbs={[
          { label: 'Students', to: '/admin/students' },
          { label: s.admissionNumber },
        ]}
        actions={
          <Button component={RouterLink} to="/admin/students" variant="outlined">
            Back to list
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography fontWeight={600} sx={{ mb: 2 }}>Profile</Typography>
            <Stack spacing={1} sx={{ typography: 'body2' }}>
              <Box>Address: {[s.address1, s.address2, s.city, s.state, s.zipcode].filter(Boolean).join(', ')}</Box>
              <Box>Phone: {s.phone || '—'}</Box>
              <Box>Last login: {formatDateTime(s.lastLoginAt)}</Box>
              <Box>First login: {formatDateTime(s.firstLoginAt)}</Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Kit status: <StatusBadge status={s.kitStatus} />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Typography fontWeight={600} sx={{ mb: 2 }}>Controls</Typography>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={s.isActive}
                    onChange={(e) => patchControls({ isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
              <TextField
                select
                size="small"
                label="Kit status"
                value={s.kitStatus}
                onChange={(e) => patchControls({ kitStatus: e.target.value })}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="ordered">Ordered</MenuItem>
              </TextField>
              <Button
                variant="outlined"
                onClick={() => patchControls({ kitStatus: 'pending' })}
              >
                Reset kit status to pending
              </Button>
              <TextField
                select
                size="small"
                label="Catalog override"
                value={s.catalogOverride || 'default'}
                onChange={(e) => patchControls({ catalogOverride: e.target.value })}
              >
                <MenuItem value="default">Default (follow store rules)</MenuItem>
                <MenuItem value="force_kit">Force kit</MenuItem>
                <MenuItem value="force_individual">Force individual</MenuItem>
              </TextField>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Typography fontWeight={600} sx={{ mb: 1 }}>Order history</Typography>
      <DataTable
        columns={[
          {
            id: 'orderNumber',
            label: 'Order',
            render: (r) => (
              <Button size="small" component={RouterLink} to={`/admin/orders/${r.id}`} onClick={(e) => e.stopPropagation()}>
                {r.orderNumber}
              </Button>
            ),
          },
          { id: 'type', label: 'Type', render: (r) => <StatusBadge status={r.type} /> },
          { id: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { id: 'paymentStatus', label: 'Payment', render: (r) => <StatusBadge status={r.paymentStatus} /> },
          { id: 'total', label: 'Total', render: (r) => formatINR(r.total) },
          { id: 'createdAt', label: 'Date', render: (r) => formatDateTime(r.createdAt) },
        ]}
        rows={data.orders || []}
        loading={false}
        emptyTitle="No orders yet"
      />
    </>
  )
}
