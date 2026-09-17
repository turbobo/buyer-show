import { Button } from '@/components/ui/button'
import { AppDialog } from '@/components/ui/app-dialog'

/**
 * 二次确认弹窗（破坏性操作必须使用；autoFocus 置于「取消」）。
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  destructive = false,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  isSubmitting?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => { if (!next) onCancel() }}
      title={title}
      description={description}
      footer={(
        <>
          <Button variant="outline" autoFocus disabled={isSubmitting} onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            className={destructive ? '' : 'bg-coral text-white hover:bg-coral-dark'}
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? '处理中...' : confirmText}
          </Button>
        </>
      )}
    />
  )
}
