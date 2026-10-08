import api from './client'

export async function listInventory(params) {
  const { data } = await api.get('/admin/inventory', { params })
  return data
}

export async function adjustStock(id, payload) {
  const { data } = await api.post(`/admin/inventory/${id}/adjust`, payload)
  return data
}

export async function listMovements(id) {
  const { data } = await api.get(`/admin/inventory/${id}/movements`)
  return data
}

export async function bulkStockPreview(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/admin/inventory/bulk/preview', form)
  return data
}

export async function bulkStockCommit(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/admin/inventory/bulk/commit', form)
  return data
}

export async function getKit() {
  const { data } = await api.get('/admin/kit')
  return data
}

export async function saveKit(payload) {
  const { data } = await api.put('/admin/kit', payload)
  return data
}

export async function listOrders(params) {
  const { data } = await api.get('/admin/orders', { params })
  return data
}

export async function getOrder(id) {
  const { data } = await api.get(`/admin/orders/${id}`)
  return data
}

export async function updateOrderStatus(id, payload) {
  const { data } = await api.patch(`/admin/orders/${id}/status`, payload)
  return data
}

export async function updateOrderPayment(id, paymentStatus) {
  const { data } = await api.patch(`/admin/orders/${id}/payment`, { paymentStatus })
  return data
}

export async function bulkOrderStatus(ids, status, note = '') {
  const { data } = await api.post('/admin/orders/bulk-status', { ids, status, note })
  return data
}

export async function pickList(ids) {
  const { data } = await api.post('/admin/orders/pick-list', { ids })
  return data
}

export async function getDashboard() {
  const { data } = await api.get('/admin/dashboard')
  return data
}

export async function getSettings() {
  const { data } = await api.get('/admin/settings')
  return data
}

export async function saveSettings(payload) {
  const { data } = await api.put('/admin/settings', payload)
  return data
}
