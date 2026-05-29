import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor - attach JWT
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const authData = localStorage.getItem('hosting-nepal-auth')
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        const token = parsed?.state?.accessToken
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch {}
    }
  }
  return config
})

// Response interceptor - handle 401 on authenticated requests only.
// Auth endpoints (login/register/forgot/reset) surface their own 401s in-page;
// redirecting from here would unmount the form before it can show the error.
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email']

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const url: string = error.config?.url || ''
      const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => url.includes(p))

      if (!isAuthEndpoint) {
        localStorage.removeItem('hosting-nepal-auth')
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
