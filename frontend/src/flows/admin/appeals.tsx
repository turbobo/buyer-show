import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { getAppeals, handleAppeal, type AppealItem } from '@/services/admin'

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all'

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'pending', label: '待处理' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
  { key: 'all', label: '全部' },
]

const PAGE_SIZE = 20

function appealStatusBadge(status: number) {
  if (status === 0) {
    return { text: '待处理', className: 'bg-yellow-500/10 text-yellow-600' }
  }
  if (status === 1) {
    return { text: '已通过', className: 'bg-emerald-500/10 text-emerald-600' }
  }
  return { text: '已驳回', className: 'bg-destructive/10 text-destructive' }
}

/**
 * 申诉处理（/admin/appeals）：帖子被下架后作者的申诉队列，管理员可通过（解封）或驳回。
 */
export default function AdminAppealsScreen() {
  const { toast } = useToast()
  const [appeals, setAppeals] = useState<AppealItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ appeal: AppealItem; action: 'APPROVE' | 'REJECT' } | null>(null)
  const [handleReason, setHandleReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const statusParam = statusFilter === 'pending' ? 0 : statusFilter === 'approved' ? 1 : statusFilter === 'rejected' ? 2 : undefined

  const load = useCallback(async (targetPage: number, append = false) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
      setError(null)
    }
    try {
      const result = await getAppeals(targetPage, PAGE_SIZE, statusParam)
      setAppeals((current) => (append ? [...current, ...result.list] : result.list))
      setTotal(result.total)
      setPage(targetPage)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载申诉列表失败')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [statusParam])

  useEffect(() => { void load(1) }, [load])

  const handleConfirm = async () => {
    if (!confirm) return
    setIsSubmitting(true)
    try {
      await handleAppeal(confirm.appeal.id, confirm.action, handleReason.trim() || undefined)
      toast('success', confirm.action === 'APPROVE' ? '已通过申诉，帖子已解封' : '已驳回申诉')
      setConfirm(null)
      setHandleReason('')
      await load(1)
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '处理失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading && appeals.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  if (error && appeals.length === 0) {
    return (
      <div className="mx-auto max-w-sm space-y-3 rounded-2xl border border-destructive/30 bg-card p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => void load(1)}>重试</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-4 text-sm text-muted-foreground">
        帖子被下架后作者可发起申诉：通过将解封恢复公开，驳回则维持下架状态。
      </p>

      {/* ─── 状态筛选 ─── */}
      <div className="mb-4 flex flex-wrap gap-1">
        {STATUS_FILTERS.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={statusFilter === item.key ? 'default' : 'outline'}
            className={statusFilter === item.key ? 'bg-coral text-white hover:bg-coral-dark' : ''}
            onClick={() => setStatusFilter(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {appeals.map((appeal) => {
          const badge = appealStatusBadge(appeal.status)
          return (
            <article key={appeal.id} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {appeal.postTitle ?? '（帖子信息不可用）'}
                </span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
                  {badge.text}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                申诉人：{appeal.userNickname ?? `用户${appeal.userId}`} · {appeal.createdAt?.slice(0, 16).replace('T', ' ')}
                {appeal.handledAt ? ` · 处理于 ${appeal.handledAt.slice(0, 16).replace('T', ' ')}` : ''}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">申诉理由：{appeal.reason}</p>
              {appeal.handleReason && (
                <p className="mt-1 text-xs text-muted-foreground">处理说明：{appeal.handleReason}</p>
              )}
              {appeal.status === 0 && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="bg-coral text-white hover:bg-coral-dark"
                    onClick={() => setConfirm({ appeal, action: 'APPROVE' })}
                  >
                    通过并解封
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirm({ appeal, action: 'REJECT' })}>
                    驳回
                  </Button>
                </div>
              )}
            </article>
          )
        })}

        {appeals.length === 0 && (
          <p className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">
            {statusFilter === 'pending' ? '当前没有待处理申诉' : '没有符合条件的申诉'}
          </p>
        )}

        {appeals.length < total && (
          <Button
            variant="outline"
            className="w-full"
            disabled={isLoadingMore}
            onClick={() => void load(page + 1, true)}
          >
            {isLoadingMore ? '加载中...' : `加载更多（${appeals.length}/${total}）`}
          </Button>
        )}
      </div>

      {/* ─── 处理确认弹窗 ─── */}
      {confirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="处理申诉确认"
        >
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">
              {confirm.action === 'APPROVE' ? '通过申诉并解封？' : '驳回申诉？'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {confirm.action === 'APPROVE'
                ? `「${confirm.appeal.postTitle ?? '该帖子'}」将恢复公开可见。`
                : `「${confirm.appeal.postTitle ?? '该帖子'}」将维持下架状态，作者可再次申诉。`}
            </p>
            {confirm.action === 'REJECT' && (
              <Textarea
                value={handleReason}
                maxLength={500}
                onChange={(event) => setHandleReason(event.target.value)}
                className="min-h-20"
                placeholder="驳回说明（选填，最多500字）"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={isSubmitting} onClick={() => { setConfirm(null); setHandleReason('') }}>
                取消
              </Button>
              <Button
                className={confirm.action === 'APPROVE' ? 'bg-coral text-white hover:bg-coral-dark' : ''}
                variant={confirm.action === 'APPROVE' ? 'default' : 'destructive'}
                disabled={isSubmitting}
                onClick={() => void handleConfirm()}
              >
                {isSubmitting ? '处理中...' : confirm.action === 'APPROVE' ? '通过并解封' : '确认驳回'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
