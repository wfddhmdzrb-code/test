import { create } from 'zustand'

interface Device {
  id: number | string  // تعديل: السيرفر يرسل Integers
  name: string
  ip: string
  description: string
  status: 'up' | 'down'
  ip_address?: string
  latency_ms?: number
  packet_loss_percent?: number
  device_type?: string
  mac_address?: string
  latency?: number
  packet_loss?: number
  timestamp?: string
}

interface Alert {
  id: number | string  // تعديل: السيرفر يرسل Integers
  timestamp: string
  level: 'INFO' | 'WARNING' | 'CRITICAL'
  device_ip: string
  device_name: string
  message: string
  metric: string
  value?: number
  threshold?: number
  // حقول إضافية للتوافق مع الباك إند
  is_resolved?: number // 0 or 1
  description?: string
  severity?: string
}

interface Statistics {
  total_devices: number
  up_devices: number
  down_devices: number
  availability: number
  avg_latency: number
  critical_alerts: number
  warning_alerts: number
  total_alerts: number
  timestamp: string
}

interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'viewer'
}

interface Store {
  devices: Device[]
  alerts: Alert[]
  statistics: Statistics | null
  loading: boolean
  error: string | null
  
  token: string | null
  user: User | null

  setDevices: (devices: Device[]) => void
  addDevice: (device: Device) => void
  updateDevice: (id: number | string, device: Partial<Device>) => void
  removeDevice: (id: number | string) => void

  setAlerts: (alerts: Alert[]) => void
  addAlert: (alert: Alert) => void

  setStatistics: (stats: Statistics) => void

  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  setToken: (token: string | null) => void
  setUser: (user: User | null) => void
  logout: () => void
}

export const useStore = create<Store>((set) => ({
  devices: [],
  alerts: [],
  statistics: null,
  loading: false,
  error: null,
  
  token: localStorage.getItem('access_token'),
  user: null,

  setDevices: (devices) => set({ devices }),
  addDevice: (device) => set((state) => ({ devices: [...state.devices, device] })),
  updateDevice: (id, device) =>
    set((state) => ({
      devices: state.devices.map((d) => String(d.id) === String(id) ? { ...d, ...device } : d),
    })),
  removeDevice: (id) =>
    set((state) => ({
      devices: state.devices.filter((d) => String(d.id) !== String(id)),
    })),

  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts].slice(0, 100) })),

  setStatistics: (statistics) => set({ statistics }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  setToken: (token) => {
    if (token) {
      localStorage.setItem('access_token', token)
    } else {
      localStorage.removeItem('access_token')
    }
    set({ token })
  },
  
  setUser: (user) => set({ user }),
  
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ token: null, user: null })
  },
}))