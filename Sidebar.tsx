import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Laptop2, AlertCircle, Network, FileText, Settings, Search } from 'lucide-react'
import clsx from 'clsx'
import { useLanguage } from '../../context/LanguageContext'

const navItems = [
  { path: '/dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
  { path: '/devices', labelKey: 'sidebar.devices', icon: Laptop2 },
  { path: '/alerts', labelKey: 'sidebar.alerts', icon: AlertCircle },
  { path: '/network', labelKey: 'sidebar.network', icon: Network },
  
  // إضافة Advanced Scanner الجديد
  { path: '/advanced-scanner', labelKey: 'Advanced IP Scanner', icon: Search },

  { path: '/reports', labelKey: 'sidebar.reports', icon: FileText },
  { path: '/settings', labelKey: 'sidebar.settings', icon: Settings },
]

interface SidebarProps {
  isOpen: boolean
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const location = useLocation()
  const { t } = useLanguage()

  return (
    <aside className={clsx(
      'bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300',
      isOpen ? 'w-64' : 'w-0 overflow-hidden'
    )}>
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200',
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}