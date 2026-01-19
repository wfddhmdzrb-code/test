import { Search, Edit2, Trash2, Plus, RefreshCw } from 'lucide-react'
import Card from '../components/common/Card'
import StatusBadge from '../components/common/StatusBadge'
import { useState, useEffect } from 'react'
import { deviceAPI } from '../services/api'
import { useStore } from '../store/useStore'
import { useLanguage } from '../context/LanguageContext'

export default function Devices() {
  const { t, language } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAddingDevice, setIsAddingDevice] = useState(false)
  const [newDevice, setNewDevice] = useState({ name: '', ip: '', type: 'other' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const { devices, setDevices } = useStore()

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const response = await deviceAPI.getAll()
      const rawData = response.data?.data || response.data || []
      const formattedDevices = rawData.map((d: any) => ({
        id: d.id || d.ip_address,
        name: d.name,
        ip: d.ip_address,
        ip_address: d.ip_address,
        device_type: d.device_type,
        status: (d.status || 'unknown').toLowerCase() === 'up' ? 'up' : 'down',
        latency_ms: d.latency_ms || 0,
        packet_loss: d.packet_loss_percent || 0,
        mac_address: d.mac_address
      }))
      setDevices(formattedDevices)
    } catch (error) {
      console.error('Failed to fetch devices:', error)
      setError('فشل في تحميل الأجهزة')
    } finally {
      setLoading(false)
    }
  }

  // دالة التحديث الجديدة: تقوم بعمل Ping أولاً ثم جلب البيانات
  const handleRealTimeRefresh = async () => {
    if (loading) return
    
    setLoading(true)
    setError(null)
    
    try {
      // 1. استدعاء نقطة الاتصال الجديدة لتحديث الحالة (Ping)
      const token = localStorage.getItem('access_token')
      await fetch('http://127.0.0.1:5000/api/devices/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      // 2. بعد نجاح التحديث، قم بجلب القائمة الجديدة
      await fetchDevices()
      setSuccess('تم تحديث حالة الأجهزة بنجاح')
      
      // إخفاء رسالة النجاح بعد 3 ثواني
      setTimeout(() => setSuccess(null), 3000)

    } catch (error: any) {
      console.error('Failed to refresh status:', error)
      setError('فشل تحديث الحالة الحية')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDevice = async () => {
    if (!newDevice.name || !newDevice.ip) {
      setError('يرجى ملء جميع الحقول المطلوبة')
      return
    }
    
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await deviceAPI.create(newDevice)
      console.log('Device created:', response.data)
      setSuccess('تم إضافة الجهاز بنجاح')
      setNewDevice({ name: '', ip: '', type: 'other' })
      setIsAddingDevice(false)
      setTimeout(() => fetchDevices(), 500)
    } catch (error: any) {
      console.error('Failed to add device:', error)
      const errorMsg = error.response?.data?.message 
        || error.response?.data?.detail 
        || error.message 
        || 'فشل في إضافة الجهاز'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure?')) return
    
    try {
      await deviceAPI.delete(deviceId)
      fetchDevices()
    } catch (error) {
      console.error('Failed to delete device:', error)
    }
  }

  const filteredDevices = devices.filter(device =>
    (device.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (device.ip || device.ip_address || '').includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('devices.title')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('devices.description')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRealTimeRefresh}
            disabled={loading}
            className="btn btn-secondary flex items-center gap-2"
            title="تحديث حالة الأجهزة (Ping)"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </button>
          <button 
            onClick={() => setIsAddingDevice(!isAddingDevice)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            {t('devices.addDevice')}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Add Device Form */}
      {isAddingDevice && (
        <Card className="border-blue-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder={t('devices.deviceName')}
              title={t('devices.deviceName')}
              value={newDevice.name}
              onChange={(e) => {
                setNewDevice({...newDevice, name: e.target.value})
                setError(null)
              }}
              className="input"
            />
            <input
              type="text"
              placeholder={t('devices.ipAddress')}
              title={t('devices.ipAddress')}
              value={newDevice.ip}
              onChange={(e) => {
                setNewDevice({...newDevice, ip: e.target.value})
                setError(null)
              }}
              className="input"
            />
            <select
              value={newDevice.type}
              title="Device type"
              onChange={(e) => setNewDevice({...newDevice, type: e.target.value})}
              className="input"
            >
              <option value="router">router</option>
              <option value="server">server</option>
              <option value="pc">pc</option>
              <option value="switch">switch</option>
              <option value="printer">printer</option>
              <option value="firewall">firewall</option>
              <option value="nas">NAS</option>
              <option value="other">other</option>
            </select>
            <div className="flex gap-2">
              <button 
                onClick={handleAddDevice} 
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? 'جاري...' : t('common.save')}
              </button>
              <button 
                onClick={() => {
                  setIsAddingDevice(false)
                  setError(null)
                  setSuccess(null)
                }} 
                className="btn btn-secondary flex-1"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-3 w-5 h-5 text-slate-400`} />
        <input
          type="text"
          placeholder={t('devices.search')}
          title={t('devices.search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`input ${language === 'ar' ? 'pr-10' : 'pl-10'}`}
        />
      </div>

      {/* Devices Table */}
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t('devices.deviceName')}</th>
                <th>{t('devices.ipAddress')}</th>
                <th>{t('devices.status')}</th>
                <th>{t('devices.latency')}</th>
                <th>{t('devices.packetLoss')}</th>
                <th>{t('devices.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">{t('common.loading')}</td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">{t('common.noData')}</td>
                </tr>
              ) : (
                filteredDevices.map((device: any) => (
                  <tr key={device.id}>
                    <td className="font-medium">{device.name || 'Unknown'}</td>
                    <td className="font-mono text-sm">{device.ip || device.ip_address || 'N/A'}</td>
                    <td>
                      <StatusBadge 
                        status={device.status as any}
                        label={device.status === 'up' ? t('devices.online_status') : t('devices.offline_status')}
                        size="sm"
                      />
                    </td>
                    <td>{device.latency_ms ? `${device.latency_ms.toFixed(2)}ms` : 'N/A'}</td>
                    <td>{device.packet_loss !== undefined ? `${device.packet_loss.toFixed(2)}%` : '0%'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Edit device">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteDevice(String(device.id))}
                          className="p-1 hover:bg-danger-100 dark:hover:bg-danger-900 rounded"
                          title="Delete device"
                        >
                          <Trash2 className="w-4 h-4 text-danger-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">{t('devices.total')}</p>
            <p className="text-3xl font-bold mt-2">{devices.length}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">{t('devices.online')}</p>
            <p className="text-3xl font-bold text-success-500 mt-2">{devices.filter(d => d.status === 'up').length}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">{t('devices.offline')}</p>
            <p className="text-3xl font-bold text-danger-500 mt-2">{devices.filter(d => d.status === 'down').length}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
