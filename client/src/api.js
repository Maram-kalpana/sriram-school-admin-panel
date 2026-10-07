export async function api(path, { method = 'GET', body, headers, isForm } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: isForm ? { ...headers } : { 'Content-Type': 'application/json', ...headers },
    body: body && !isForm ? JSON.stringify(body) : body,
  };
  const res = await fetch(path, opts);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { error: { message: text } }; }
  if (!res.ok) {
    const err = new Error(json?.error?.message || 'Request failed');
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

export const adminApi = {
  login: (body) => api('/api/admin/auth/login', { method: 'POST', body }),
  logout: () => api('/api/admin/auth/logout', { method: 'POST', body: {} }),
  me: () => api('/api/admin/auth/me'),
  stats: () => api('/api/admin/stats'),
  students: (qs) => api(`/api/admin/students?${qs}`),
  student: (id) => api(`/api/admin/students/${id}`),
  saveStudent: (id, body) => api(id ? `/api/admin/students/${id}` : '/api/admin/students', { method: id ? 'PATCH' : 'POST', body }),
  deleteStudent: (id) => api(`/api/admin/students/${id}`, { method: 'DELETE' }),
  bulkStudents: (body) => api('/api/admin/students/bulk', { method: 'POST', body }),
  previewImport: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api('/api/admin/students/import/preview', { method: 'POST', body: fd, isForm: true });
  },
  commitImport: (previewId) => api('/api/admin/students/import/commit', { method: 'POST', body: { previewId } }),
  categories: () => api('/api/admin/categories'),
  saveCategory: (id, body) => api(id ? `/api/admin/categories/${id}` : '/api/admin/categories', { method: id ? 'PATCH' : 'POST', body }),
  deleteCategory: (id) => api(`/api/admin/categories/${id}`, { method: 'DELETE' }),
  products: (qs) => api(`/api/admin/products?${qs}`),
  product: (id) => api(`/api/admin/products/${id}`),
  saveProduct: (id, body) => api(id ? `/api/admin/products/${id}` : '/api/admin/products', { method: id ? 'PATCH' : 'POST', body }),
  bulkProductStatus: (body) => api('/api/admin/products/bulk-status', { method: 'POST', body }),
  upload: (files) => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    return api('/api/admin/uploads', { method: 'POST', body: fd, isForm: true });
  },
  inventory: (qs) => api(`/api/admin/inventory${qs ? `?${qs}` : ''}`),
  stockMove: (id, body) => api(`/api/admin/inventory/${id}/move`, { method: 'POST', body }),
  movements: (id) => api(`/api/admin/inventory/${id}/movements`),
  kit: () => api('/api/admin/kit'),
  saveKit: (body) => api('/api/admin/kit', { method: 'PUT', body }),
  orders: (qs) => api(`/api/admin/orders?${qs}`),
  order: (id) => api(`/api/admin/orders/${id}`),
  setOrderStatus: (id, body) => api(`/api/admin/orders/${id}/status`, { method: 'POST', body }),
  pickList: (ids) => api('/api/admin/orders/pick-list', { method: 'POST', body: { ids } }),
  settings: () => api('/api/admin/settings'),
  saveSettings: (body) => api('/api/admin/settings', { method: 'PUT', body }),
  admins: () => api('/api/admin/admins'),
  createAdmin: (body) => api('/api/admin/admins', { method: 'POST', body }),
  patchAdmin: (id, body) => api(`/api/admin/admins/${id}`, { method: 'PATCH', body }),
};

export const shopApi = {
  bootstrap: () => api('/api/storefront/bootstrap'),
  login: (body) => api('/api/storefront/login', { method: 'POST', body }),
  logout: () => api('/api/storefront/logout', { method: 'POST', body: {} }),
  me: () => api('/api/storefront/me'),
  catalog: () => api('/api/storefront/catalog'),
  checkout: (body) => api('/api/storefront/checkout', { method: 'POST', body }),
  orders: () => api('/api/storefront/orders'),
  order: (id) => api('/api/storefront/orders/${id}'.replace('${id}', id)),
};
