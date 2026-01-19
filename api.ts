import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:5000/api')

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const deviceAPI = {
  getAll: () => api.get('/devices'),
  getById: (id: number | string) => api.get(`/devices/${id}`),
  getHistory: (id: number | string) => api.get(`/devices/${id}/history`),
  create: (device: any) => {
    const payload = {
      name: device.name,
      ip_address: device.ip || device.ip_address,
      device_type: device.type || device.device_type,
      mac_address: device.mac_address || null
    }
    return api.post('/devices', payload)
  },
  update: (id: number | string, device: any) => {
    const payload = {
      name: device.name,
      device_type: device.type || device.device_type,
      status: device.status,
      is_monitored: device.is_monitored,
      is_critical: device.is_critical
    }
    return api.put(`/devices/${id}`, payload)
  },
  delete: (id: number | string) => api.delete(`/devices/${id}`),
}

export const alertAPI = {
  getAll: (level?: string, limit?: number) => {
    const params = new URLSearchParams()
    if (level) params.append('level', level)
    if (limit) params.append('limit', limit.toString())
    return api.get(`/alerts?${params.toString()}`)
  },
  check: () => api.post('/alerts/check'),
}

export const statisticsAPI = {
  getStats: () => api.get('/statistics'),
  getBandwidth: () => api.get('/network/bandwidth'),
  getPerformance: (days?: number) => {
    const params = days ? `?days=${days}` : ''
    return api.get(`/network/performance${params}`)
  },
}

export const reportAPI = {
  generate: (type: string) => api.post('/reports/generate', { type }),
  export: (format: string) => api.get(`/reports/export?format=${format}`),
}

export const configAPI = {
  get: () => api.get('/config'),
  update: (config: any) => api.put('/config', config),
}

export const healthAPI = {
  check: () => api.get('/health'),
}

export const wifiAPI = {
  scanNetworks: () => api.post('/wifi/scan'),
  scanDevices: () => api.post('/wifi/scan/devices'),
  getNetworks: () => api.get('/wifi/networks'),
  getNetwork: (bssid: string) => api.get(`/wifi/networks/${bssid}`),
  deleteNetwork: (networkId: number | string) => api.delete(`/wifi/networks/${networkId}`),
  getDevices: () => api.get('/wifi/devices'),
  getDevice: (mac: string) => api.get(`/wifi/devices/${mac}`),
  getNetworkDevices: (bssid: string) => api.get(`/wifi/networks/${bssid}/devices`),
  getAlerts: () => api.get('/wifi/alerts'),
  resolveAlert: (alertId: number | string) => api.post(`/wifi/alerts/${alertId}/resolve`),
  getDetections: () => api.get('/wifi/detections'),
  getScanHistory: (limit?: number) => api.get('/wifi/history', { params: { limit } }),
  getStats: () => api.get('/wifi/stats'),
}

export const subnetAPI = {
  scanSubnet: () => api.post('/scan/subnet'),
  getSubnetScans: (limit?: number) => api.get('/subnet-scans', { params: { limit } }),
  getSubnets: () => api.get('/subnets'),
}

export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (credentials: any) => api.post('/auth/login', credentials),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  getCurrentUser: () => api.get('/auth/me'),
}

export default api
