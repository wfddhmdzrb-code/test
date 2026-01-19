import Card from './Card'

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: React.ReactNode
  change?: number
  trend?: 'up' | 'down' | 'stable'
}

export default function StatCard({ label, value, unit, icon, change, trend }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}{unit && ` ${unit}`}</p>
          {change !== undefined && (
            <p className={`text-sm mt-2 ${
              trend === 'up' ? 'text-danger-600 dark:text-danger-400' :
              trend === 'down' ? 'text-success-600 dark:text-success-400' :
              'text-slate-600 dark:text-slate-400'
            }`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {Math.abs(change)}%
            </p>
          )}
        </div>
        {icon && <div className="text-3xl opacity-60">{icon}</div>}
      </div>
    </Card>
  )
}
