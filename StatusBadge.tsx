import clsx from 'clsx'

type StatusType = 'up' | 'warning' | 'down' | 'info'

interface StatusBadgeProps {
  status: StatusType
  label: string
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig: Record<StatusType, { bg: string; text: string; dot: string }> = {
  up: {
    bg: 'bg-success-100 dark:bg-success-900',
    text: 'text-success-700 dark:text-success-200',
    dot: 'bg-success-500',
  },
  warning: {
    bg: 'bg-warning-100 dark:bg-warning-900',
    text: 'text-warning-700 dark:text-warning-200',
    dot: 'bg-warning-500',
  },
  down: {
    bg: 'bg-danger-100 dark:bg-danger-900',
    text: 'text-danger-700 dark:text-danger-200',
    dot: 'bg-danger-500',
  },
  info: {
    bg: 'bg-info-100 dark:bg-info-900',
    text: 'text-info-700 dark:text-info-200',
    dot: 'bg-info-500',
  },
}

export default function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <div className={clsx(
      'inline-flex items-center gap-2 px-3 py-1 rounded-full font-medium',
      config.bg,
      config.text,
      size === 'sm' && 'text-xs',
      size === 'md' && 'text-sm',
      size === 'lg' && 'text-base'
    )}>
      <div className={clsx('rounded-full animate-pulse-slow', config.dot, 'w-2 h-2')}></div>
      {label}
    </div>
  )
}
