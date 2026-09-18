import { Button } from '@/components/ui/button'
import type { AdminPostDetail, AdminUserPost } from '@/services/admin'

/** 帖子审核状态徽标（封禁/待审/公开中），帖子管理面板与预览弹窗共用 */
export function postStatusBadge(moderationStatus: number) {
  if (moderationStatus === 2) {
    return { text: '已封禁', className: 'bg-destructive/10 text-destructive' }
  }
  if (moderationStatus === 1) {
    return { text: '待审', className: 'bg-yellow-500/10 text-yellow-600' }
  }
  return { text: '公开中', className: 'bg-emerald-500/10 text-emerald-600' }
}

/** 详情转列表条目（预览弹窗内发起封禁/解封时使用） */
function toPostBrief(detail: AdminPostDetail): AdminUserPost {
  return {
    id: detail.id,
    title: detail.title,
    coverImage: detail.images?.[0] ?? null,
    moderationStatus: detail.moderationStatus,
    status: detail.status,
    createdAt: detail.createdAt,
  }
}

interface PostPreviewDialogProps {
  post: AdminPostDetail
  onClose: () => void
  onBan: (post: AdminUserPost) => void
  onUnban: (post: AdminUserPost) => void
}

/* ─── 帖子管理预览弹窗（查看后再决定是否封禁） ─── */
export function PostPreviewDialog({ post, onClose, onBan, onUnban }: PostPreviewDialogProps) {
  const badge = postStatusBadge(post.moderationStatus)
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="帖子预览"
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl">
        {post.images?.[0]?.startsWith('http') && (
          <div
            className="h-44 w-full shrink-0 bg-muted"
            style={{ background: `url(${post.images[0]}) center / cover` }}
          />
        )}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold text-foreground">{post.title}</h3>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
              {badge.text}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground/80">{post.content}</p>
          {(post.productName || post.productPrice != null) && (
            <p className="text-sm text-coral">
              ¥{post.productPrice ?? '—'} · {post.productSource ?? '—'}
              {post.productName ? ` · ${post.productName}` : ''}
              {post.productRating != null ? ` · ${post.productRating}分` : ''}
            </p>
          )}
          {post.moderationReason && (
            <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
              当前状态说明：{post.moderationReason}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            作者：{post.userNickname ?? `用户${post.userId}`}
            {' · '}发布于 {post.createdAt?.slice(0, 16).replace('T', ' ')}
            {' · '}赞 {post.likeCount} · 评论 {post.commentCount}
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 p-4">
          <a
            href={`/posts/${post.id}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-coral underline-offset-2 hover:underline"
          >
            前台查看 ↗
          </a>
          <div className="flex gap-2">
            {post.moderationStatus === 2 ? (
              <Button variant="outline" onClick={() => onUnban(toPostBrief(post))}>
                解封
              </Button>
            ) : post.moderationStatus === 0 ? (
              <Button variant="destructive" onClick={() => onBan(toPostBrief(post))}>
                封禁
              </Button>
            ) : null}
            <Button variant="outline" onClick={onClose}>关闭</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
