import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * 一步式弹层封装（U34 统一原语，基于 Base UI Dialog）。
 * 内置：遮罩、Esc 关闭、点击遮罩关闭、焦点陷阱、aria 关联、关闭按钮。
 * 层叠：z-[60]（符合层叠约定）；一次只应存在一个弹层。
 */
export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 'sm:max-w-sm',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  width?: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`z-[60] gap-3 rounded-2xl border border-border/60 bg-card p-6 text-foreground shadow-xl ${width}`}>
        <DialogTitle className="text-lg font-bold text-foreground">{title}</DialogTitle>
        {description && (
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>
        )}
        {children}
        {footer && <div className="mt-1 flex flex-wrap justify-end gap-2">{footer}</div>}
      </DialogContent>
    </Dialog>
  )
}
