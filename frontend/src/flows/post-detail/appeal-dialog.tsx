import { AppDialog } from '@/components/ui/app-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ApiPost } from '@/services/posts'

/* ─── 发起申诉弹窗（U34：统一 AppDialog） ─── */
export function AppealDialog({ post, isOpen, isSubmitting, reason, onReasonChange, onSubmit, onClose }: {
  post: ApiPost
  isOpen: boolean
  isSubmitting: boolean
  reason: string
  onReasonChange: (value: string) => void
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <AppDialog
      open={isOpen && post !== null}
      onOpenChange={(next) => { if (!next) onClose() }}
      title="发起申诉"
      description={post ? `「${post.title}」已被下架，无法修改。提交申诉后由管理员复核，请说明理由。` : undefined}
      footer={(
        <>
          <Button
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            className="bg-coral text-white hover:bg-coral-dark"
            disabled={isSubmitting || !reason.trim()}
            onClick={onSubmit}
          >
            {isSubmitting ? '提交中...' : '提交申诉'}
          </Button>
        </>
      )}
    >
      <Textarea
        value={reason}
        maxLength={500}
        onChange={(event) => onReasonChange(event.target.value)}
        className="min-h-24"
        placeholder="申诉理由（必填，最多500字）"
        aria-label="申诉理由"
      />
    </AppDialog>
  )
}
