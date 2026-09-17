// 我的评论：面板组件（主页「评论」Tab 内嵌与直链页共用）——全部评论/收藏的评论，支持删除与触底加载
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bookmark, Home, Loader2, Trash2 } from 'lucide-react'
import { smartBack } from '@/lib/smart-back'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import {
  deleteComment,
  getFavoriteComments,
  getUserComments,
  toggleCommentFavorite,
  type UserComment,
} from '@/services/comments'

function formatTime(value: string): string {
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/**
 * 我的评论面板（主页「评论」Tab 与直链页共用；不含页面外壳导航）。
 */
export function MyCommentsPanel() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [comments, setComments] = useState<UserComment[]>([])
  const [activeTab, setActiveTab] = useState<'mine' | 'favorites'>('mine')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UserComment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (nextCursor?: string) => {
    const append = Boolean(nextCursor)
    if (append) setIsLoadingMore(true)
    else setIsLoading(true)
    setError(null)
    try {
      const page = activeTab === 'favorites'
        ? await getFavoriteComments(nextCursor)
        : await getUserComments(nextCursor)
      setComments((current) => (append ? [...current, ...page.list] : page.list))
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载失败，请稍后重试')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [activeTab])

  useEffect(() => { void load() }, [load])

  // 触底自动加载更多
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore || isLoadingMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && cursor) {
          void load(cursor)
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, cursor, load])

  const handleDelete = async () => {
    if (!confirmDelete) return
    setIsDeleting(true)
    try {
      await deleteComment(confirmDelete.id)
      setComments((current) => current.filter((item) => item.id !== confirmDelete.id))
      setConfirmDelete(null)
      toast('success', '评论已删除')
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '删除失败，请重试')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUnfavorite = async (comment: UserComment) => {
    try {
      await toggleCommentFavorite(comment.id)
      setComments((current) => current.filter((item) => item.id !== comment.id))
      toast('success', '已取消收藏')
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '取消收藏失败')
    }
  }

  return (
    <>
      {/* 分类切换：我的评论 / 收藏的评论 */}
      <div className="mb-4 flex items-center gap-1 rounded-full bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'mine' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            我的评论
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'favorites' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            收藏的评论
          </button>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : comments.length === 0 ? (
          <div className="rounded-xl bg-card p-12 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              {activeTab === 'favorites' ? '还没有收藏评论' : '还没有发表过评论'}
            </p>
            <Button onClick={() => navigate('/')} className="bg-coral text-white hover:bg-coral-dark">
              去逛逛
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <article key={comment.id} className="rounded-xl border border-border/60 bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  {comment.moderationStatus === 1 && (
                    <span className="rounded bg-yellow-500/90 px-1.5 py-0.5 text-[10px] text-white">审核中</span>
                  )}
                  {comment.moderationStatus === 2 && (
                    <span className="rounded bg-destructive/90 px-1.5 py-0.5 text-[10px] text-white">未通过</span>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/posts/${comment.postId}`)}
                    className="max-w-full truncate text-xs text-coral hover:underline"
                  >
                    来自帖子：{comment.postTitle}
                  </button>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatTime(comment.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{comment.content}</p>
                <div className="mt-3 flex justify-end">
                  {activeTab === 'favorites' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="取消收藏"
                      className="h-8 text-xs text-muted-foreground hover:text-coral"
                      onClick={() => void handleUnfavorite(comment)}
                    >
                      <Bookmark className="mr-1 h-3.5 w-3.5" />
                      取消收藏
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="删除评论"
                      className="h-8 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDelete(comment)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      删除
                    </Button>
                  )}
                </div>
              </article>
            ))}
            {hasMore && (
              <div ref={loadMoreRef} className="py-6 text-center">
                {isLoadingMore && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}
              </div>
            )}
          </div>
        )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="删除这条评论？"
        description="删除后不可恢复，评论将不再展示。"
        confirmText="删除"
        destructive
        isSubmitting={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )
}

/** 直链页（/profile/comments）：Stack 导航 + 面板（旧链接兼容，站内主入口在个人主页「评论」Tab）。 */
export default function MyCommentsScreen() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <div className="flex items-center gap-1 -ml-3">
            <Button aria-label="返回上一页" variant="ghost" size="icon" onClick={() => smartBack()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button aria-label="返回首页" variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/')}>
              <Home className="h-5 w-5" />
            </Button>
          </div>
          <h1 className="flex-1 truncate text-lg font-bold text-foreground">我的评论</h1>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <MyCommentsPanel />
      </main>
    </div>
  )
}
