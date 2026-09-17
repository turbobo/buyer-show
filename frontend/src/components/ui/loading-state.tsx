import { Loader2 } from 'lucide-react'

/**
 * 统一加载态（旋转指示 + 可访问性播报）。
 */
export function LoadingState({ label = '加载中', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-8 ${className}`} role="status" aria-live="polite">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
