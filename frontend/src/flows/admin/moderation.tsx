import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  getPendingComments,
  getPendingPosts,
  moderateComment,
  moderatePost,
  type PendingComment,
  type PendingPost,
} from '@/services/admin'

type Tab = 'posts' | 'comments'

// 审核状态常量
const MODERATION_STATUS = {
  APPROVED: 0,  // 通过
  REJECTED: 2,  // 驳回
} as const

function imageBackground(image?: string): string {
  if (image?.startsWith('http')) {
    const encoded = encodeURI(image).replace(/[()]/g, encodeURIComponent)
    return `url("${encoded}") center / cover`
  }
  return image || 'linear-gradient(135deg,#fecdd3,#fda4af)'
}

export default function AdminModerationScreen() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('posts')
  const [posts, setPosts] = useState<PendingPost[]>([])
  const [comments, setComments] = useState<PendingComment[]>([])
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<{ type: 'post' | 'comment'; id: number; action: 'REJECT' } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (tab === 'posts') setPosts((await getPendingPosts()).list)
      else setComments((await getPendingComments()).list)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载审核队列失败')
    } finally {
      setIsLoading(false)
    }
  }, [tab])

  useEffect(() => { void load() }, [load])

  const moderate = async (type: 'post' | 'comment', id: number, action: 'APPROVE' | 'REJECT') => {
    try {
      const status = action === 'APPROVE' ? MODERATION_STATUS.APPROVED : MODERATION_STATUS.REJECTED
      if (type === 'post') await moderatePost(id, status, reason || undefined)
      else await moderateComment(id, status, reason || undefined)
      setReason('')
      toast('success', action === 'APPROVE' ? '已通过' : '已驳回')
      await load()
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '审核失败')
    }
  }

  const handleConfirmReject = async () => {
    if (!confirmAction) return
    setIsSubmitting(true)
    await moderate(confirmAction.type, confirmAction.id, confirmAction.action)
    setIsSubmitting(false)
    setConfirmAction(null)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-4 text-sm text-muted-foreground">
        通过或驳回待审内容；用户举报请前往「举报中心」处理。
      </p>

      {/* ─── Tab 切换 ─── */}
        <div className="mb-4 flex flex-wrap gap-2">
          {([
            { key: 'posts', label: `待审帖子 ${posts.length}` },
            { key: 'comments', label: `待审评论 ${comments.length}` },
          ] as const).map((item) => (
            <Button
              key={item.key}
              variant={tab === item.key ? 'default' : 'outline'}
              className={tab === item.key ? 'bg-coral text-white hover:bg-coral-dark' : ''}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <Textarea
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          placeholder="驳回或审核说明（可选，最多500字）"
          className="mb-4 bg-card"
        />

        {error && <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        {isLoading ? (
          <p className="rounded-xl bg-card p-8 text-center text-muted-foreground">加载中...</p>
        ) : (
          <div className="space-y-3">
            {/* ─── 待审帖子 ─── */}
            {tab === 'posts' && posts.map((post) => (
              <article key={post.id} className="rounded-xl border border-border/60 bg-card p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{post.title}</h2>
                  <span className="text-xs text-muted-foreground">#{post.id}</span>
                </div>

                {/* 图片预览 */}
                {post.images.length > 0 && (
                  <div className="mb-3 flex gap-2 overflow-x-auto">
                    {post.images.map((img, index) => (
                      <div
                        key={index}
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border/40"
                        style={{ background: imageBackground(img) }}
                      />
                    ))}
                  </div>
                )}

                <p className="whitespace-pre-wrap text-sm text-foreground/80">{post.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  命中原因：{post.moderationReason ?? '人工待审'} · {post.createdAt}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => void moderate('post', post.id, 'APPROVE')}>通过</Button>
                  <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ type: 'post', id: post.id, action: 'REJECT' })}>驳回</Button>
                </div>
              </article>
            ))}

            {/* ─── 待审评论 ─── */}
            {tab === 'comments' && comments.map((comment) => (
              <article key={comment.id} className="rounded-xl border border-border/60 bg-card p-4">
                <div className="mb-2 flex justify-between">
                  <span className="font-semibold">评论 #{comment.id}</span>
                  <span className="text-xs text-muted-foreground">帖子 #{comment.postId}</span>
                </div>
                <p className="text-sm text-foreground/80">{comment.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  命中原因：{comment.moderationReason ?? '人工待审'} · {comment.createdAt}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => void moderate('comment', comment.id, 'APPROVE')}>通过</Button>
                  <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ type: 'comment', id: comment.id, action: 'REJECT' })}>驳回</Button>
                </div>
              </article>
            ))}

            {/* ─── 空状态 ─── */}
            {((tab === 'posts' && posts.length === 0) ||
              (tab === 'comments' && comments.length === 0)) && (
              <p className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">
                当前没有待处理内容
              </p>
            )}
          </div>
        )}
      {/* ─── 驳回二次确认 ─── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="确认驳回">
          <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold">确认驳回？</h3>
            <p className="mt-2 text-sm text-muted-foreground">驳回后该内容将从公开范围移除，操作不可撤销。</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" disabled={isSubmitting} onClick={() => setConfirmAction(null)}>取消</Button>
              <Button variant="destructive" disabled={isSubmitting} onClick={() => void handleConfirmReject()}>
                {isSubmitting ? '处理中...' : '确认驳回'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
