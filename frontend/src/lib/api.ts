import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Inject auth token from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ld_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ld_token')
      localStorage.removeItem('ld_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateMe: (data: any) => api.put('/auth/me', data),
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  recentActivity: () => api.get('/dashboard/recent-activity'),
}

// ─── Dogs ────────────────────────────────────────────────────────────────────
export const dogsApi = {
  list: (params?: any) => api.get('/dogs', { params }),
  get: (id: string) => api.get(`/dogs/${id}`),
  create: (data: any) => api.post('/dogs', data),
  update: (id: string, data: any) => api.put(`/dogs/${id}`, data),
  delete: (id: string) => api.delete(`/dogs/${id}`),
}

// ─── Litters ─────────────────────────────────────────────────────────────────
export const littersApi = {
  list: (params?: any) => api.get('/litters', { params }),
  get: (id: string) => api.get(`/litters/${id}`),
  create: (data: any) => api.post('/litters', data),
  update: (id: string, data: any) => api.put(`/litters/${id}`, data),
  delete: (id: string) => api.delete(`/litters/${id}`),
  puppies: (id: string) => api.get(`/litters/${id}/puppies`),
  addPuppy: (id: string, data: any) => api.post(`/litters/${id}/puppies`, data),
  waitlist: (id: string) => api.get(`/litters/${id}/waitlist`),
}

// ─── Buyers ──────────────────────────────────────────────────────────────────
export const buyersApi = {
  list: (params?: any) => api.get('/buyers', { params }),
  get: (id: string) => api.get(`/buyers/${id}`),
  create: (data: any) => api.post('/buyers', data),
  update: (id: string, data: any) => api.put(`/buyers/${id}`, data),
  addToWaitlist: (buyerId: string, litterId: string) =>
    api.post(`/buyers/${buyerId}/add-to-waitlist`, null, { params: { litter_id: litterId } }),
  communications: (id: string) => api.get(`/buyers/${id}/communications`),
  logContact: (id: string, data: any) =>
    api.post(`/buyers/${id}/log-contact`, null, { params: data }),
}

// ─── Contracts ───────────────────────────────────────────────────────────────
export const contractsApi = {
  list: (params?: any) => api.get('/contracts', { params }),
  get: (id: string) => api.get(`/contracts/${id}`),
  send: (id: string) => api.post(`/contracts/${id}/send`),
  void: (id: string) => api.delete(`/contracts/${id}`),
  getForSigning: (token: string) => api.get(`/contracts/sign/${token}`),
  sign: (token: string, data: any) => api.post(`/contracts/sign/${token}`, null, { params: data }),
}

// ─── AI ──────────────────────────────────────────────────────────────────────
export const aiApi = {
  generateContract: (data: any) => api.post('/ai/generate-contract', data),
  scoreBuyer: (buyerId: string) => api.post('/ai/score-buyer', { buyer_id: buyerId }),
  draftEmail: (data: any) => api.post('/ai/draft-email', data),
  matchLitter: (litterId: string) => api.post(`/ai/match-litter/${litterId}`),
  litterAnnouncement: (litterId: string) => api.post(`/ai/litter-announcement/${litterId}`),
}

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentsApi = {
  createSubscription: (plan: string) => api.post(`/payments/create-subscription/${plan}`),
  createPortal: () => api.post('/payments/create-portal'),
  collectDeposit: (data: any) => api.post('/payments/collect-deposit', null, { params: data }),
  stripeConnectOnboard: () => api.post('/payments/stripe-connect/onboard'),
}
