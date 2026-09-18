import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/* ─── 详情页加载骨架（浮层 / 整页双形态） ─── */
export function DetailSkeleton({ isModal, closeModal }: { isModal: boolean; closeModal: () => void }) {
  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 md:p-6"
        onClick={(event) => { if (event.target === event.currentTarget) closeModal() }}
      >
        <div className="mx-auto w-full max-w-2xl bg-background p-6 shadow-xl md:my-6 md:rounded-2xl">
          <Skeleton className="mb-4 aspect-[4/3] w-full rounded-2xl" />
          <Skeleton className="mb-2 h-6 w-3/4" />
          <Skeleton className="mb-4 h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b border-border bg-card/95 md:top-14">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Skeleton className="mb-4 aspect-[4/3] w-full rounded-2xl" />
        <Skeleton className="mb-2 h-6 w-3/4" />
        <Skeleton className="mb-4 h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  )
}

/* ─── 详情页错误态（浮层 / 整页双形态：加载失败或帖子不存在） ─── */
export function DetailError({ isModal, loadError, onRetry, onCloseModal, onGoHome }: {
  isModal: boolean
  loadError: string | null
  onRetry: () => void
  onCloseModal: () => void
  onGoHome: () => void
}) {
  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 md:p-6"
        onClick={(event) => { if (event.target === event.currentTarget) onCloseModal() }}
      >
        <div className="mx-auto mt-16 w-full max-w-md bg-background p-8 text-center shadow-xl md:rounded-2xl">
          <p className="mb-2 text-lg font-semibold text-foreground">{loadError ? '加载失败' : '帖子不存在'}</p>
          <p className="mb-6 text-sm text-muted-foreground">{loadError ?? '该帖子可能已被删除或无权查看'}</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onRetry}>重新加载</Button>
            <Button onClick={onCloseModal} className="bg-coral text-white hover:bg-coral-dark">关闭</Button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <p className="mb-2 text-lg font-semibold text-foreground">{loadError ? '加载失败' : '帖子不存在'}</p>
      <p className="mb-6 text-sm text-muted-foreground">{loadError ?? '该帖子可能已被删除或无权查看'}</p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onRetry}>重新加载</Button>
        <Button onClick={onGoHome} className="bg-coral text-white hover:bg-coral-dark">返回首页</Button>
      </div>
    </div>
  )
}
