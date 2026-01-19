import { Menu, Moon, Sun, Bell, User, Globe, LogOut, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { useStore } from '../../store/useStore'

interface HeaderProps {
  isDark: boolean
  onToggleTheme: () => void
  onToggleSidebar: () => void
}

export default function Header({ isDark, onToggleTheme, onToggleSidebar }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const { user, logout, alerts } = useStore()
  
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  // حساب حالة النظام بناءً على التنبيهات الحالية
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy')

  useEffect(() => {
    if (!alerts || alerts.length === 0) {
      setSystemStatus('healthy')
      return
    }

    // البحث عن تنبيهات غير محلولة
    const criticalAlerts = alerts.filter((a: any) => a.level === 'CRITICAL' && !a.is_resolved)
    const warningAlerts = alerts.filter((a: any) => a.level === 'WARNING' && !a.is_resolved)

    if (criticalAlerts.length > 0) {
      setSystemStatus('critical')
    } else if (warningAlerts.length > 0) {
      setSystemStatus('warning')
    } else {
      setSystemStatus('healthy')
    }
  }, [alerts])

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  // ألوان وأيقونات ديناميكية للحالة
  const getStatusConfig = () => {
    switch(systemStatus) {
      case 'critical':
        return {
          bgClass: 'bg-danger-100 dark:bg-danger-900',
          textClass: 'text-danger-700 dark:text-danger-200',
          label: t('status.critical') || 'خطأ حرج',
          icon: <AlertTriangle className="w-4 h-4" />
        }
      case 'warning':
        return {
          bgClass: 'bg-warning-100 dark:bg-warning-900',
          textClass: 'text-warning-700 dark:text-warning-200',
          label: t('status.warning') || 'تحذير',
          icon: <Bell className="w-4 h-4" />
        }
      default: // healthy
        return {
          bgClass: 'bg-success-100 dark:bg-success-900',
          textClass: 'text-success-700 dark:text-success-200',
          label: t('status.healthy') || 'سليم',
          icon: <CheckCircle2 className="w-4 h-4" />
        }
    }
  }

  const statusConfig = getStatusConfig()

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={onToggleSidebar}
            aria-label={t('toggleSidebar') || 'Toggle sidebar'}
            title={t('toggleSidebar') || 'Toggle sidebar'}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')} title="Go to Dashboard">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
              NM
            </div>
            <h1 className="text-lg font-bold hidden sm:block text-slate-800 dark:text-white">NetMon</h1>
          </div>
        </div>

        {/* شارة حالة النظام الحية */}
        <div className={`ml-4 px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 border transition-colors ${statusConfig.bgClass} ${statusConfig.textClass} border-transparent`}>
          {statusConfig.icon}
          <span>{statusConfig.label}</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 dark:text-slate-400 hidden md:block font-mono">
            {new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>

          {/* زر التنبيهات */}
          <button
            type="button"
            onClick={() => navigate('/alerts')}
            aria-label={t('notifications') || 'Notifications'}
            title={t('notifications') || 'Notifications'}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg relative transition-colors"
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {/* نقطة حمراء إذا كان هناك تنبيهات خطرة */}
            {alerts.filter((a: any) => a.level === 'CRITICAL' && !a.is_resolved).length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-danger-500 rounded-full border-2 border-white animate-pulse" aria-hidden="true"></span>
            )}
          </button>

          {/* زر اللغة */}
          <div className="relative">
            <button 
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Globe className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:block">{language.toUpperCase()}</span>
            </button>
            
            {showLanguageMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                <button
                    onClick={() => {
                    setLanguage('ar')
                    setShowLanguageMenu(false)
                    }}
                    className={`w-full text-right px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors ${language === 'ar' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200' : ''}`}
                >
                  العربية
                </button>
                <button
                    onClick={() => {
                    setLanguage('en')
                    setShowLanguageMenu(false)
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors border-t border-slate-100 dark:border-slate-700 ${language === 'en' ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200' : ''}`}
                >
                  English
                </button>
              </div>
            )}
          </div>

          {/* زر السمة (Dark/Light) */}
          <button 
            onClick={onToggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* قائمة المستخدم */}
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors"
            >
              <User className="w-5 h-5" />
              {user && <span className="text-sm font-medium hidden sm:block">{user.username}</span>}
            </button>
            
            {showUserMenu && (
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{user?.username}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role === 'admin' ? 'مسؤول النظام' : 'مشاهد'}</p>
                </div>
                <button
                    onClick={() => {
                      navigate('/settings')
                      setShowUserMenu(false)
                    }}
                    className="w-full text-right px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm flex items-center gap-2 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    الإعدادات
                  </button>
                <button
                    onClick={handleLogout}
                    className="w-full text-right px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm flex items-center gap-2 text-danger-600 dark:text-danger-400 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    تسجيل الخروج
                  </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}