import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { getPendingReports, handleReport, type ContentReport } from '@/services/admin'

/**
 * 举报中心（/admin/reports）。
 * 处置动作为破坏性操作：采纳下架需二次确认；驳回可直接操作。
 */
export default function AdminReportsScreen() {
  const { toast } = useToast()
  const [reports, setReports] = useState<ContentReport[]>([])
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [confirmAccept, setConfirmAccept] = useState<ContentReport | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setReports((await getPendingReports()).list)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载举报列表失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const processReport = async (id: number, action: 'ACCEPT' | 'REJECT') => {
    try {
      await handleReport(id, action, reason || undefined)
      setReason('')
      toast('success', action === 'ACCEPT' ? '已采纳并下架' : '已驳回举报')
      await load()
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '处理举报失败')
    }
  }

  const handleConfirmAccept = async () => {
    if (!confirmAccept) return
    setIsSubmitting(true)
    await processReport(confirmAccept.id, 'ACCEPT')
    setIsSubmitting(false)
    setConfirmAccept(null)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-4 text-sm text-muted-foreground">
        核实举报内容：采纳将下架被举报内容，驳回则保留原内容。
      </p>

      <Textarea
        value={reason}
        maxLength={500}
        onChange={(event) => setReason(event.target.value)}
        placeholder="处置说明（可选，最多500字）"
        className="mb-4 bg-card"
      />

      {error && <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <p className="rounded-xl bg-card p-8 text-center text-muted-foreground">加载中...</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={report.id} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-semibold">
                  {report.contentType === 'POST' ? '帖子' : '评论'} #{report.contentId}
                </span>
                <span className="text-xs text-muted-foreground">
                  举报人：{report.reporterNickname ?? `用户${report.reporterId}`}
                </span>
              </div>
              <p className="text-sm">原因：{report.reason}</p>
              {report.contentType === 'POST' && (
                <p className="mt-1 text-sm text-muted-foreground">
                  帖子标题：{report.postTitle ?? '（内容已删除）'}
                  <a
                    href={`/posts/${report.contentId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-coral underline-offset-2 hover:underline"
                  >
                    查看原帖 ↗
                  </a>
                </p>
              )}
              {report.contentType === 'COMMENT' && (
                <p className="mt-1 text-sm text-muted-foreground">
                  评论内容：{report.commentContent ?? '（内容已删除）'}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{report.createdAt}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => setConfirmAccept(report)}>
                  采纳并下架
                </Button>
                <Button size="sm" variant="outline" onClick={() => void processReport(report.id, 'REJECT')}>
                  驳回举报
                </Button>
              </div>
            </article>
          ))}

          {reports.length === 0 && (
            <p className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">当前没有待处理举报</p>
          )}
        </div>
      )}

      {/* ─── 采纳下架二次确认 ─── */}
      {confirmAccept && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="确认采纳举报"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold">确认采纳并下架？</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              被举报的{confirmAccept.contentType === 'POST' ? '帖子' : '评论'}将从公开范围移除，操作不可撤销。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" disabled={isSubmitting} onClick={() => setConfirmAccept(null)}>
                取消
              </Button>
              <Button variant="destructive" disabled={isSubmitting} onClick={() => void handleConfirmAccept()}>
                {isSubmitting ? '处理中...' : '确认下架'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
