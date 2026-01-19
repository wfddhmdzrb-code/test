import { Network, RefreshCw, AlertTriangle, Save } from 'lucide-react'
import Card from '../components/common/Card'
import StatusBadge from '../components/common/StatusBadge'
import { useState } from 'react'
import axios from 'axios'

interface ScannedDevice {
  ip_address: string
  status: string
  latency_ms: number | null
  device_type: string
}

export default function AdvancedScanner() {
  const [subnet, setSubnet] = useState('192.168.1.0/24')
  const [scanning, setScanning] = useState(false)
  const [devices, setDevices] = useState<ScannedDevice[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleScan = async () => {
    if (!subnet) {
      setError('يرجى إدخال نطاق الشبكة')
      return
    }

    setScanning(true)
    setError(null)
    setSuccess(null)
    setDevices([])

    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.post(
        'http://127.0.0.1:5000/api/scan/advanced',
        { subnet: subnet, timeout: 1 },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const data = response.data
      if (data.success) {
        setDevices(data.data?.devices || [])
        setSuccess(data.message)
      } else {
        setError(data.message || 'فشل المسح')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'حدث خطأ أثناء الاتصال بالسيرفر')
      console.error(err)
    } finally {
      setScanning(false)
    }
  }

  const handleSaveDevice = async (ip: string) => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.post(
        'http://127.0.0.1:5000/api/devices',
        {
          name: `Device-${ip.split('.')[3]}`,
          ip_address: ip,
          device_type: 'other'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )
      alert(`تم إضافة الجهاز ${ip} للقائمة`)
    } catch (err: any) {
      alert('فشل إضافة الجهاز: قد يكون موجوداً بالفعل')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="w-8 h-8" />
            Advanced IP Scanner
          </h1>
          <p className="text-slate-600 dark:text-slate-400">مسح نطاقات IP محددة بدقة عالية</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Input Card */}
      <Card title="إعدادات المسح">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="subnet-input" className="block text-sm font-medium mb-2">
              نطاق الشبكة (Subnet CIDR)
            </label>
            <input
              id="subnet-input"
              type="text"
              placeholder="مثال: 192.168.1.0/24"
              title="Enter subnet range in CIDR notation"
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              className="input w-full"
              disabled={scanning}
            />
            <p className="text-xs text-slate-500 mt-1">
              مثال: 192.168.1.0/24 (للأجهزة من 1 إلى 254)
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="btn btn-primary h-10 px-6"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'جاري المسح...' : 'بدء المسح'}
          </button>
        </div>
      </Card>

      {/* Results */}
      {devices.length > 0 && (
        <Card title={`نتائج المسح (${devices.length} أجهزة)`}>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>الحالة</th>
                  <th>زمن الاستجابة (Latency)</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device, idx) => (
                  <tr key={idx}>
                    <td className="font-mono font-bold">{device.ip_address}</td>
                    <td>
                      <StatusBadge status={device.status === 'up' ? 'up' : 'down'} label={device.status.toUpperCase()} size="sm" />
                    </td>
                    <td>
                      {device.latency_ms !== null ? `${device.latency_ms.toFixed(2)}ms` : '-'}
                    </td>
                    <td>
                      <button
                        onClick={() => handleSaveDevice(device.ip_address)}
                        className="btn btn-sm btn-secondary flex items-center gap-1"
                        title="Save to device list"
                      >
                        <Save className="w-3 h-3" />
                        حفظ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      
      {devices.length === 0 && !scanning && !success && (
        <Card>
          <div className="text-center py-8 text-slate-500">
            أدخل نطاق IP واضغط "بدء المسح" للبدء
          </div>
        </Card>
      )}
    </div>
  )
}