import clsx from 'clsx'

interface CardProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  noPadding?: boolean
}

export default function Card({ title, subtitle, children, className, noPadding }: CardProps) {
  return (
    <div className={clsx('card', className)}>
      {(title || subtitle) && (
        <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
        </div>
      )}
      <div className={noPadding ? '' : ''}>
        {children}
      </div>
    </div>
  )
}
