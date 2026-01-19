import { AlertCircle, CheckCircle2, XCircle, Clock, RefreshCw, Check } from 'lucide-react'
import Card from '../components/common/Card'
import { useState, useEffect } from 'react'
import { alertAPI } from '../services/api'
import { useStore } from '../store/useStore'
import { useLanguage } from '../context/LanguageContext'
import axios from 'axios'

// تعريف واجهة محلية باسم فريد لتجنب التعارض مع Store
interface LocalAlertItem {
  id: number | string;
  message: string;
  level: string; // INFO, WARNING, CRITICAL
  severity: string;
  device_name: string;
  device_ip: string;
  device_id?: number;
  description?: string;
  metric?: string;
  value?: number | string;
  threshold?: number;
  timestamp: string;
  is_resolved?: number; // 0 or 1
}

export default function Alerts() {
  const { t } = useLanguage()
  const [filterLevel, setFilterLevel] = useState('all')
  const [loading, setLoading] = useState(false)
  
  // جلب البيانات من الـ Store
  const { alerts, setAlerts } = useStore()

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const response = await alertAPI.getAll()
      const rawData = response.data?.data || response.data || []
      
      // تحويل البيانات وتوحيد أنواعها داخل الواجهة المحلية
      const formattedAlerts = (Array.isArray(rawData) ? rawData : []).map((a: any): LocalAlertItem => ({
        id: a.id,
        message: a.title || a.message || 'Alert',
        level: a.severity?.toUpperCase() || a.level?.toUpperCase() || 'INFO',
        severity: a.severity || a.level || 'info',
        device_name: a.device?.name || a.device_name || 'Unknown Device',
        device_ip: a.device?.ip_address || a.device_ip || 'N/A',
        device_id: a.device_id,
        description: a.description || a.message,
        metric: a.alert_type || 'Unknown',
        value: a.value,
        threshold: a.threshold,
        timestamp: a.created_at || new Date().toISOString(),
        is_resolved: a.is_resolved || 0,
        ...a
      }))
      
      // إرسال البيانات للـ Store مع تحويل النوع لتجاوز أخطاء التحقق الصارمة
      setAlerts(formattedAlerts as unknown as any)
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkNewAlerts = async () => {
    try {
      // طلب فحص الأجهزة (سيولد تنبيهات تلقائياً)
      await alertAPI.check()
      // إعادة جلب التنبيهات
      fetchAlerts()
    } catch (error) {
      console.error('Failed to check alerts:', error)
    }
  }

  const handleResolveAlert = async (alertId: number | string) => {
    try {
      const token = localStorage.getItem('access_token')
      const idNum = typeof alertId === 'string' ? parseInt(alertId) : alertId

      await axios.put(`http://127.0.0.1:5000/api/alerts/${idNum}/resolve`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      // إزالة التنبيه محلياً
      // نقوم بعمل فلترة ثم إرسال النتيجة للـ Store
      // نستخدم as LocalAlertItem[] لتجنب أخطاء TypeScript داخل الفلترة
      setAlerts((alerts as LocalAlertItem[]).filter(a => String(a.id) !== String(alertId)) as unknown as any)
    } catch (error) {
      console.error('Failed to resolve alert:', error)
      alert('فشل حل التنبيه')
    }
  }

  // تصفية التنبيهات
  // نقوم بتحويل alerts من Store إلى LocalAlertItem[] قبل الفلترة
  const filteredAlerts = filterLevel === 'all' 
    ? (alerts as LocalAlertItem[]) 
    : (alerts as LocalAlertItem[]).filter(a => (a.level || '').toUpperCase() === filterLevel.toUpperCase())

  const getSeverityIcon = (level: string) => {
    switch(level) {
      case 'CRITICAL': return <XCircle className="w-5 h-5 text-danger-500" />
      case 'WARNING': return <AlertCircle className="w-5 h-5 text-warning-500" />
      case 'INFO': return <CheckCircle2 className="w-5 h-5 text-info-500" />
      default: return null
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'الآن'
    if (diffMins < 60) return `قبل ${diffMins} دقيقة`
    if (diffHours < 24) return `قبل ${diffHours} ساعة`
    return `قبل ${diffDays} يوم`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('alerts.title')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('alerts.description')}</p>
        </div>
        <button 
          onClick={checkNewAlerts}
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('alerts.check')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'CRITICAL', 'WARNING', 'INFO'].map(level => {
          let label = level === 'all' ? t('common.search') : level
          if (level === 'CRITICAL') label = t('alerts.critical')
          else if (level === 'WARNING') label = t('alerts.warning')
          else if (level === 'INFO') label = t('alerts.info')
          
          return (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterLevel === level
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Alerts List */}
      <Card>
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-4">{t('common.loading')}</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-4 text-slate-500">{t('alerts.noAlerts')}</div>
          ) : (
            filteredAlerts.map(alert => (
              <div key={alert.id} className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                alert.is_resolved 
                  ? 'border-success-200 bg-success-50/50 dark:bg-success-900/10' 
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}>
                <div className="mt-1">
                  {getSeverityIcon(alert.level)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className={`font-semibold ${alert.is_resolved ? 'line-through text-slate-400' : ''}`}>
                        {alert.message}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{alert.device_name} ({alert.device_ip})</p>
                    </div>
                    <span className={`badge ${
                      alert.level === 'CRITICAL' ? 'badge-danger' : 
                      alert.level === 'WARNING' ? 'badge-warning' : 
                      'badge-success'
                    }`}>
                      {alert.level}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    {alert.metric || 'Alert Type'}: {typeof alert.value === 'number' ? alert.value.toFixed(2) : 'N/A'} 
                    {typeof alert.threshold === 'number' ? ` (حد: ${alert.threshold.toFixed(2)})` : ''}
                  </p>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp ? formatTime(alert.timestamp) : 'Unknown time'}
                    </div>

                    {/* زر حل التنبيه */}
                    {!alert.is_resolved && (
                      <button 
                        onClick={() => handleResolveAlert(alert.id)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium transition-colors"
                        title="Resolve Alert"
                      >
                        <Check className="w-4 h-4" />
                        حل
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">{t('alerts.critical')}</p>
            <p className="text-3xl font-bold text-danger-500 mt-2">
              {(alerts as LocalAlertItem[]).filter(a => (a.level || '').toUpperCase() === 'CRITICAL' && !a.is_resolved).length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">{t('alerts.warning')}</p>
            <p className="text-3xl font-bold text-warning-500 mt-2">
              {(alerts as LocalAlertItem[]).filter(a => (a.level || '').toUpperCase() === 'WARNING' && !a.is_resolved).length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">{t('alerts.total')}</p>
            <p className="text-3xl font-bold text-info-500 mt-2">
              {(alerts as LocalAlertItem[]).filter(a => !a.is_resolved).length}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}