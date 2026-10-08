import api from './client'

export async function listCategories() {
  const { data } = await api.get('/admin/categories')
  return data
}

export async function createCategory(payload) {
  const { data } = await api.post('/admin/categories', payload)
  return data
}

export async function updateCategory(id, payload) {
  const { data } = await api.patch(`/admin/categories/${id}`, payload)
  return data
}

export async function deleteCategory(id) {
  const { data } = await api.delete(`/admin/categories/${id}`)
  return data
}

export async function listProducts(params) {
  const { data } = await api.get('/admin/products', { params })
  return data
}

export async function getProduct(id) {
  const { data } = await api.get(`/admin/products/${id}`)
  return data
}

export async function createProduct(payload) {
  const { data } = await api.post('/admin/products', payload)
  return data
}

export async function updateProduct(id, payload) {
  const { data } = await api.patch(`/admin/products/${id}`, payload)
  return data
}

export async function deleteProduct(id) {
  const { data } = await api.delete(`/admin/products/${id}`)
  return data
}

export async function bulkProductStatus(ids, status) {
  const { data } = await api.post('/admin/products/bulk-status', { ids, status })
  return data
}

export async function duplicateProduct(id) {
  const { data } = await api.post(`/admin/products/${id}/duplicate`)
  return data
}

export async function uploadProductImages(id, files) {
  const form = new FormData()
  ;[...files].forEach((f) => form.append('images', f))
  const { data } = await api.post(`/admin/products/${id}/images`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function reorderProductImages(id, images) {
  const { data } = await api.patch(`/admin/products/${id}/images`, { images })
  return data
}

export async function deleteProductImage(id, imageId) {
  const { data } = await api.delete(`/admin/products/${id}/images/${imageId}`)
  return data
}
