import axios from 'axios'

// Reuses mega project's accessToken stored in localStorage
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) window.location.href = '/login'
    return Promise.reject(err)
  }
)

// ── Templates ────────────────────────────────────────────────────────────────
export const templatesApi = {
  getAll: () => api.get('/templates').then((r) => r.data.data ?? []),
  create: (fd: FormData) =>
    api
      .post('/templates', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data.data),
  delete: (id: string) => api.delete(`/templates/${id}`).then((r) => r.data.data),
  sync:   (id: string) => api.post(`/templates/${id}/sync`).then((r) => r.data.data),
}

// ── Campaigns ────────────────────────────────────────────────────────────────
export const campaignsApi = {
  getAll:  ()           => api.get('/campaigns').then((r) => r.data.data ?? []),
  getById: (id: string) => api.get(`/campaigns/${id}`).then((r) => r.data.data),
  create:  (data: any)  => api.post('/campaigns', data).then((r) => r.data.data),
  pause:   (id: string) => api.post(`/campaigns/${id}/pause`).then((r) => r.data.data),
  resume:  (id: string) => api.post(`/campaigns/${id}/resume`).then((r) => r.data.data),
  getContacts: (id: string, status?: string) =>
    api
      .get(`/campaigns/${id}/contacts`, { params: status ? { status } : {} })
      .then((r) => r.data.data ?? []),
}

// ── Webhooks ─────────────────────────────────────────────────────────────────
export const webhooksApi = {
  getEvents: () => api.get('/webhooks/events').then((r) => r.data.data ?? []),
}

// ── WA Config ────────────────────────────────────────────────────────────────
export const waConfigApi = {
  get:  ()          => api.get('/settings/whatsapp').then((r) => r.data.data),
  save: (data: any) => api.post('/settings/whatsapp', data).then((r) => r.data.data),
  test: ()          => api.post('/settings/whatsapp/test').then((r) => r.data.data),
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => api.get('/dashboard').then((r) => r.data.data),
}

export default api