import type { LucideIcon } from 'lucide-react'

/**
 * 统一空态：图标 + 标题 + 描述 + 可选操作（规范 §5.4）。
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-10 text-center ${className}`}>
      {Icon && <Icon className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-xs text-xs text-muted-foreground">{description}</p>}
      {action}
    </div>
  )
}
