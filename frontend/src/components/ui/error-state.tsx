import { Button } from '@/components/ui/button'

/**
 * 统一错误态（就近展示 + 可选重试；action 可自定义操作区）。
 */
export function ErrorState({
  message,
  onRetry,
  action,
  className = '',
}: {
  message: string
  onRetry?: () => void
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-destructive/30 bg-card p-6 text-center ${className}`} role="alert">
      <p className="mb-3 text-sm text-destructive">{message}</p>
      {action ?? (onRetry && (
        <Button variant="outline" onClick={onRetry}>
          重新加载
        </Button>
      ))}
    </div>
  )
}
