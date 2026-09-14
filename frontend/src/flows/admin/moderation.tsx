import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getTokenRole } from '@/services/http'
import { useToast } from '@/components/ui/toast'
import {
  getPendingComments,
  getPendingPosts,
  getPendingReports,
  handleReport,
  moderateComment,
  moderatePost,
  type ContentReport,
  type PendingComment,
  type PendingPost,
} from '@/services/admin'

type Tab = 'posts' | 'comments' | 'reports'

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
  const [reports, setReports] = useState<ContentReport[]>([])
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isAdmin = getTokenRole() === 'ADMIN'

  const load = useCallback(async () => {
    if (!isAdmin) return
    setIsLoading(true)
    setError(null)
    try {
      if (tab === 'posts') setPosts((await getPendingPosts()).list)
      else if (tab === 'comments') setComments((await getPendingComments()).list)
      else setReports((await getPendingReports()).list)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载审核队列失败')
    } finally {
      setIsLoading(false)
    }
  }, [isAdmin, tab])

  useEffect(() => { void load() }, [load])
  if (!isAdmin) return <Navigate to="/login" replace />

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

  const processReport = async (id: number, action: 'ACCEPT' | 'REJECT') => {
    try {
      await handleReport(id, action, reason || undefined)
      toast('success', action === 'ACCEPT' ? '已采纳并下架' : '已驳回举报')
      await load()
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '处理举报失败')
    }
  }

  return (
    <main className="min-h-screen bg-warm-bg p-4 md:p-8">
      <section className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="text-sm font-semibold text-coral">管理员</p>
          <h1 className="text-2xl font-bold">内容审核工作台</h1>
          <p className="mt-1 text-sm text-muted-foreground">通过、驳回待审内容，或处置用户举报。</p>
        </header>

        {/* ─── Tab 切换 ─── */}
        <div className="mb-4 flex flex-wrap gap-2">
          {([
            { key: 'posts', label: `待审帖子 ${posts.length}` },
            { key: 'comments', label: `待审评论 ${comments.length}` },
            { key: 'reports', label: `待处理举报 ${reports.length}` },
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
          className="mb-4 bg-white"
        />

        {error && <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        {isLoading ? (
          <p className="rounded-xl bg-white p-8 text-center text-muted-foreground">加载中...</p>
        ) : (
          <div className="space-y-3">
            {/* ─── 待审帖子 ─── */}
            {tab === 'posts' && posts.map((post) => (
              <article key={post.id} className="rounded-xl border border-border/60 bg-white p-4">
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
                  <Button size="sm" variant="destructive" onClick={() => void moderate('post', post.id, 'REJECT')}>驳回</Button>
                </div>
              </article>
            ))}

            {/* ─── 待审评论 ─── */}
            {tab === 'comments' && comments.map((comment) => (
              <article key={comment.id} className="rounded-xl border border-border/60 bg-white p-4">
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
                  <Button size="sm" variant="destructive" onClick={() => void moderate('comment', comment.id, 'REJECT')}>驳回</Button>
                </div>
              </article>
            ))}

            {/* ─── 待处理举报 ─── */}
            {tab === 'reports' && reports.map((report) => (
              <article key={report.id} className="rounded-xl border border-border/60 bg-white p-4">
                <div className="mb-2 flex justify-between">
                  <span className="font-semibold">举报 #{report.id}</span>
                  <span className="text-xs text-muted-foreground">
                    {report.contentType === 'POST' ? '帖子' : '评论'} #{report.contentId}
                  </span>
                </div>
                <p className="text-sm">原因：{report.reason}</p>
                {report.postTitle && (
                  <p className="mt-1 text-sm text-muted-foreground">帖子标题：{report.postTitle}</p>
                )}
                {report.commentContent && (
                  <p className="mt-1 text-sm text-muted-foreground">评论内容：{report.commentContent}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{report.createdAt}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => void processReport(report.id, 'ACCEPT')}>
                    采纳并下架
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void processReport(report.id, 'REJECT')}>
                    驳回举报
                  </Button>
                </div>
              </article>
            ))}

            {/* ─── 空状态 ─── */}
            {((tab === 'posts' && posts.length === 0) ||
              (tab === 'comments' && comments.length === 0) ||
              (tab === 'reports' && reports.length === 0)) && (
              <p className="rounded-xl bg-white p-8 text-center text-sm text-muted-foreground">
                当前没有待处理内容
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
