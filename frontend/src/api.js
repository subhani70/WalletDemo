import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// API endpoints
export const didAPI = {
  create: () => api.post('/create-did'),
  resolve: (did) => api.get(`/resolve-did/${encodeURIComponent(did)}`)
}

export const vcAPI = {
  issue: (data) => api.post('/store-vc', data),
  list: () => api.get('/list-vc'),
  verify: (jwt) => api.post('/verify-vc', { jwt })
}

export const vpAPI = {
  create: (data) => api.post('/create-vp', data),
  verify: (vpJwt, challenge) => api.post('/verify-vp', { vpJwt, challenge })
}

export const healthAPI = {
  check: () => api.get('/health')
}

export default api