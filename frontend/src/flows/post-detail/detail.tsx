import { useCallback, useEffect, useState } from 'react'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { ArrowLeft, Flag, Home, MessageCircle, Pencil, Sparkles } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { smartBack } from '@/lib/smart-back'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { createComment, encodeCursor, getComments, toggleCommentFavorite, toggleCommentLike, updateComment, type ApiComment } from '@/services/comments'
import { PostImageCarousel } from './image-carousel'
import { CommentItem, updateCommentTree } from './comment-item'
import { PostContent, buildPostJsonLd } from './post-content'
import { DetailError, DetailSkeleton } from './detail-states'
import { ActionBar } from './action-bar'
import { AppealDialog } from './appeal-dialog'
import { ApiError, getTokenUserId } from '@/services/http'
import { blockUser } from '@/services/users'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getPost, getRelatedPosts, createPostAppeal, toggleFavorite, toggleLike, type ApiPost, type ApiPostSummary, type CursorPage } from '@/services/posts'
import { createContentReport } from '@/services/reports'
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer'
import { PostStructuredData } from '@/components/structured-data'
import { useToast } from '@/components/ui/toast'
import { trackPostView, trackPostLike, trackPostFavorite, trackCommentCreate } from '@/services/analytics'

/** 顶级评论分页大小（超过时显示「查看更多评论」）。 */
const COMMENT_PAGE_SIZE = 20

function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && [1002, 1003, 1007].includes(error.code)
}

/** G6：递归过滤评论树中指定用户发布的评论（含嵌套回复）。 */
function filterCommentsByUser(list: ApiComment[], userId: number): ApiComment[] {
  return list
    .filter((comment) => comment.userId !== userId)
    .map((comment) => ({
      ...comment,
      replies: filterCommentsByUser(comment.replies, userId),
    }))
}

/* ─── 详情页主组件 ─── */
export default function PostDetailScreen() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  // U23 详情浮层：从浏览列表（Feed/搜索/主页）点击进入时以浮层展示，直链/刷新仍为整页
  const isModal = (location.state as { modal?: boolean } | null)?.modal === true
  const closeModal = useCallback(() => navigate(-1), [navigate])
  const { toast } = useToast()
  const queryClient = useQueryClient()
  /** 详情页互动后同步 Feed 列表缓存（P4.1：精准局部更新，免整列表重拉）；无缓存时静默跳过 */
  const patchFeedPost = useCallback((patch: (item: ApiPostSummary) => Partial<ApiPostSummary>) => {
    queryClient.setQueriesData<InfiniteData<CursorPage<ApiPostSummary>>>(
      { queryKey: ['feed'] },
      (old) => old && {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          list: page.list.map((item) => (item.id === Number(postId) ? { ...item, ...patch(item) } : item)),
        })),
      },
    )
  }, [queryClient, postId])
  const [post, setPost] = useState<ApiPost | null>(null)
  const [comments, setComments] = useState<ApiComment[]>([])
  const [pendingBlockComment, setPendingBlockComment] = useState<ApiComment | null>(null)
  const [isBlockSubmitting, setIsBlockSubmitting] = useState(false)
  /** G3 相关推荐（猜你喜欢）；加载失败静默降级为空列表 */
  const [relatedPosts, setRelatedPosts] = useState<ApiPostSummary[]>([])
  const [commentSort, setCommentSort] = useState<'latest' | 'hot'>('latest')
  const [commentLikeSubmitting, setCommentLikeSubmitting] = useState<Set<number>>(new Set())
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyTarget, setReplyTarget] = useState<ApiComment | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false)
  const [isFavoriteSubmitting, setIsFavoriteSubmitting] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenIndex, setFullscreenIndex] = useState(0)
  const [isAppealOpen, setIsAppealOpen] = useState(false)
  const [appealReason, setAppealReason] = useState('')
  const [isAppealSubmitting, setIsAppealSubmitting] = useState(false)

  const handleSubmitAppeal = async () => {
    if (!post) return
    setIsAppealSubmitting(true)
    try {
      await createPostAppeal(String(post.id), appealReason.trim())
      toast('success', '申诉已提交，等待管理员处理')
      setPost((current) => (current ? { ...current, appealStatus: 0 } : current))
      setIsAppealOpen(false)
      setAppealReason('')
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '提交申诉失败')
    } finally {
      setIsAppealSubmitting(false)
    }
  }

  const redirectToLogin = useCallback(() => {
    navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)
  }, [navigate, location.pathname])

  const load = useCallback(async () => {
    if (!postId) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const postData = await getPost(postId)
      setPost(postData)
      if (postData.moderationStatus === 0) {
        // 评论与相关推荐并行加载；推荐失败仅隐藏区块，不影响详情页
        const [commentList, relatedList] = await Promise.all([
          getComments(postId, 'latest', undefined, COMMENT_PAGE_SIZE),
          getRelatedPosts(postId).catch(() => []),
        ])
        setComments(commentList)
        setRelatedPosts(relatedList)
      } else {
        setComments([])
      }
    } catch (requestError) {
      setLoadError(requestError instanceof Error ? requestError.message : '加载失败')
    } finally {
      setIsLoading(false)
    }
  }, [postId])

  useEffect(() => { void load() }, [load])

  const handleActionError = (error: unknown, fallback: string) => {
    if (isAuthError(error)) {
      redirectToLogin()
      return
    }
    toast('error', error instanceof Error ? error.message : fallback)
  }

  const handleSubmitComment = async () => {
    if (!postId || !commentText.trim() || isCommentSubmitting) return
    setIsCommentSubmitting(true)
    try {
      const comment = await createComment(postId, commentText.trim(), replyTarget?.id)
      setCommentText('')
      setReplyTarget(null)
      setComments((current) => replyTarget
        ? current.map((item) => item.id === replyTarget.id
          ? { ...item, replies: [...item.replies, comment] }
          : item)
        : [...current, comment])
      patchFeedPost((item) => ({ commentCount: item.commentCount + 1 }))
      toast('success', comment.moderationStatus === 1 ? '评论已提交，审核通过后公开展示' : '评论发布成功')
    } catch (requestError) {
      handleActionError(requestError, '评论发布失败')
    } finally {
      setIsCommentSubmitting(false)
    }
  }

  const handleLike = async () => {
    if (!postId || isLikeSubmitting) return
    setIsLikeSubmitting(true)
    try {
      const result = await toggleLike(postId)
      setPost((current) => current && ({
        ...current,
        isLiked: result.liked,
        likeCount: Math.max(0, current.likeCount + (result.liked ? 1 : -1)),
      }))
      // Feed 卡片同步（仅当缓存中的状态与本次切换相反时才增减计数）
      patchFeedPost((item) => ({
        isLiked: result.liked,
        likeCount: item.likeCount + (result.liked === item.isLiked ? 0 : result.liked ? 1 : -1),
      }))
      toast('success', result.liked ? '已点赞' : '已取消点赞')
    } catch (requestError) {
      handleActionError(requestError, '点赞失败')
    } finally {
      setIsLikeSubmitting(false)
    }
  }

  const handleFavorite = async () => {
    if (!postId || isFavoriteSubmitting) return
    setIsFavoriteSubmitting(true)
    try {
      const result = await toggleFavorite(postId)
      setPost((current) => current && ({
        ...current,
        isFavorited: result.favorited,
        favoriteCount: Math.max(0, current.favoriteCount + (result.favorited ? 1 : -1)),
      }))
      patchFeedPost((item) => ({
        isFavorited: result.favorited,
        favoriteCount: item.favoriteCount + (result.favorited === item.isFavorited ? 0 : result.favorited ? 1 : -1),
      }))
      toast('success', result.favorited ? '已收藏' : '已取消收藏')
    } catch (requestError) {
      handleActionError(requestError, '收藏失败')
    } finally {
      setIsFavoriteSubmitting(false)
    }
  }

  const handleShare = async () => {
    if (!post) return
    const url = `${window.location.origin}/posts/${post.id}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: post.title, url })
        return
      } catch {
        // 用户取消系统分享，回退复制链接
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast('success', '链接已复制')
    } catch {
      toast('error', '复制失败，请手动复制')
    }
  }

  const handleSortChange = async (sort: 'latest' | 'hot') => {
    if (sort === commentSort || !postId) return
    setCommentSort(sort)
    try {
      setComments(await getComments(postId, sort, undefined, COMMENT_PAGE_SIZE))
    } catch (requestError) {
      handleActionError(requestError, '评论加载失败')
    }
  }

  const handleLoadMoreComments = async () => {
    if (!postId || comments.length === 0) return
    setIsLoadingMoreComments(true)
    try {
      const lastRoot = comments[comments.length - 1]
      const more = await getComments(postId, 'latest', encodeCursor(lastRoot.id), COMMENT_PAGE_SIZE)
      setComments((current) => [...current, ...more])
    } catch (requestError) {
      handleActionError(requestError, '加载更多评论失败')
    } finally {
      setIsLoadingMoreComments(false)
    }
  }

  const handleCommentFavorite = async (comment: ApiComment) => {
    try {
      const result = await toggleCommentFavorite(comment.id)
      setComments((current) => updateCommentTree(current, comment.id, (item) => ({
        ...item,
        isFavorited: result.favorited,
      })))
      toast('success', result.favorited ? '已收藏评论' : '已取消收藏')
    } catch (requestError) {
      handleActionError(requestError, '收藏失败')
    }
  }

    const handleCommentEdit = async (comment: ApiComment, content: string) => {
    try {
      await updateComment(comment.id, content)
      if (postId) {
        // 重新拉取以同步审核状态与编辑标记
        setComments(await getComments(postId, commentSort, undefined, COMMENT_PAGE_SIZE))
      }
      toast('success', '评论已更新')
    } catch (requestError) {
      handleActionError(requestError, '编辑失败')
      throw requestError
    }
  }

  /** G6：拉黑评论作者，并从当前评论树移除其全部评论。 */
  const handleBlockComment = async () => {
    if (!pendingBlockComment) return
    const targetUserId = pendingBlockComment.userId
    setIsBlockSubmitting(true)
    try {
      await blockUser(targetUserId)
      setComments((current) => filterCommentsByUser(current, targetUserId))
      toast('success', '已拉黑该用户')
      setPendingBlockComment(null)
    } catch (requestError) {
      handleActionError(requestError, '拉黑失败')
    } finally {
      setIsBlockSubmitting(false)
    }
  }

  const handleCommentLike = async (comment: ApiComment) => {
    if (commentLikeSubmitting.has(comment.id)) return
    setCommentLikeSubmitting((current) => new Set(current).add(comment.id))
    try {
      const result = await toggleCommentLike(comment.id)
      setComments((current) => updateCommentTree(current, comment.id, (item) => ({
        ...item,
        isLiked: result.liked,
        likeCount: result.likeCount,
      })))
    } catch (requestError) {
      handleActionError(requestError, '点赞失败')
    } finally {
      setCommentLikeSubmitting((current) => {
        const next = new Set(current)
        next.delete(comment.id)
        return next
      })
    }
  }

  const handleReport = async (contentType: 'POST' | 'COMMENT', contentId: number) => {
    try {
      await createContentReport(contentType, contentId, '用户举报')
      toast('success', '举报已提交，管理员将尽快处理')
    } catch (requestError) {
      handleActionError(requestError, '举报提交失败')
    }
  }

  if (isLoading) return <DetailSkeleton isModal={isModal} closeModal={closeModal} />
  if (!post || loadError) {
    return (
      <DetailError
        isModal={isModal}
        loadError={loadError}
        onRetry={() => void load()}
        onCloseModal={closeModal}
        onGoHome={() => navigate('/')}
      />
    )
  }

  // JSON-LD 结构化数据（SEO）
  const jsonLd = buildPostJsonLd(post)

  const fallbackImages = ['linear-gradient(135deg,#fecdd3,#fda4af)']
  const displayImages = post.images.length > 0 ? post.images : fallbackImages

  return (
    <div
      className={isModal ? 'fixed inset-0 z-[60] overflow-y-auto bg-black/50 md:p-6' : 'min-h-screen bg-background pb-24'}
      onClick={isModal ? (event) => { if (event.target === event.currentTarget) closeModal() } : undefined}
    >
      <div className={isModal ? 'mx-auto w-full max-w-2xl bg-background shadow-xl md:my-6 md:overflow-hidden md:rounded-2xl' : ''}>
      {/* ─── 结构化数据 ─── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── 顶部导航 ─── */}
      <nav className={`sticky top-0 z-50 border-b border-border bg-card/95 ${isModal ? 'md:top-0' : 'md:top-14'}`}>
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <div className="flex items-center gap-1 -ml-3">
            <Button aria-label="返回上一页" variant="ghost" size="icon" onClick={() => smartBack()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button aria-label="返回首页" variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/')}>
              <Home className="h-5 w-5" />
            </Button>
          </div>
          <button
            type="button"
            aria-label={`${post.userNickname} 的主页`}
            className="flex flex-1 items-center gap-3 text-left hover:opacity-80"
            onClick={() => navigate(`/user/${post.userId}`)}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-coral-light text-[10px] text-coral-contrast">
                {post.userNickname?.[0] ?? '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{post.userNickname}</span>
          </button>
          {post.userId === getTokenUserId() && post.moderationStatus !== 2 && (
            <Button aria-label="编辑帖子" variant="ghost" size="icon" onClick={() => navigate(`/posts/${post.id}/edit`)}>
              <Pencil className="h-5 w-5" />
            </Button>
          )}
          {post.moderationStatus === 0 && (
            <Button aria-label="举报帖子" variant="ghost" size="icon" onClick={() => void handleReport('POST', post.id)}>
              <Flag className="h-5 w-5" />
            </Button>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {post.moderationStatus === 1 && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">该帖子正在审核，仅作者可见。</p>
        )}
        {post.moderationStatus === 2 && post.userId === getTokenUserId() && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">该帖子已被下架，无法修改。如有异议可发起申诉，由管理员复核。</p>
            {post.appealStatus === 0 ? (
              <span className="text-xs text-muted-foreground">申诉处理中</span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsAppealOpen(true)}>发起申诉</Button>
            )}
          </div>
        )}

        {/* ─── 移动端：图片全宽展示 ─── */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-border/60 bg-card md:hidden">
          <PostImageCarousel images={displayImages} title={post.title} onImageClick={(index) => { setFullscreenIndex(index); setShowFullscreen(true) }} />
        </div>

        {/* ─── 帖子内容卡片 ─── */}
        <article className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          {/* 桌面端：左图右文 */}
          <div className="hidden md:grid md:grid-cols-2">
            <PostImageCarousel images={displayImages} title={post.title} onImageClick={(index) => { setFullscreenIndex(index); setShowFullscreen(true) }} />
            <div className="p-5">
              <PostContent post={post} />
            </div>
          </div>

          {/* 移动端：紧凑布局 */}
          <div className="p-5 md:hidden">
            <PostContent post={post} />
          </div>
        </article>

        {/* ─── 评论区（独立区块） ─── */}
        {post.moderationStatus === 0 && (
          <section className="mt-6 rounded-2xl border border-border/60 bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-foreground" />
              <h2 className="font-semibold">评论 ({comments.length})</h2>
              <div className="ml-auto flex items-center gap-1 rounded-full bg-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => void handleSortChange('latest')}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    commentSort === 'latest' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  最新
                </button>
                <button
                  type="button"
                  onClick={() => void handleSortChange('hot')}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    commentSort === 'hot' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  最热
                </button>
              </div>
            </div>
            {comments.length === 0 ? (
              <div className="py-8 text-center">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">还没有评论，来说两句吧</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onReply={setReplyTarget}
                    onReport={(commentId) => void handleReport('COMMENT', commentId)}
                    onLike={(item) => void handleCommentLike(item)}
                    onFavorite={(item) => void handleCommentFavorite(item)}
                    onEdit={handleCommentEdit}
                    onBlock={setPendingBlockComment}
                    currentUserId={getTokenUserId()}
                  />
                ))}
              </div>
            )}
            {commentSort === 'latest' && comments.length >= COMMENT_PAGE_SIZE && (
              <div className="pt-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-coral hover:text-coral/80"
                  disabled={isLoadingMoreComments}
                  onClick={() => void handleLoadMoreComments()}
                >
                  {isLoadingMoreComments ? '加载中...' : '查看更多评论'}
                </Button>
              </div>
            )}
          </section>
        )}

        {/* ─── 猜你喜欢（G3：同标签相关推荐） ─── */}
        {post.moderationStatus === 0 && relatedPosts.length > 0 && (
          <section className="mt-6 rounded-2xl border border-border/60 bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-foreground" />
              <h2 className="font-semibold">猜你喜欢</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {relatedPosts.map((item) => {
                const thumbnail = item.thumbnails?.[0] ?? item.images?.[0]
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="group overflow-hidden rounded-xl border border-border/60 bg-background text-left transition-shadow hover:shadow-md"
                    onClick={() => navigate(`/posts/${item.id}`, { state: { modal: true } })}
                  >
                    <div className="aspect-square w-full overflow-hidden bg-muted">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">暂无图片</div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="line-clamp-2 text-xs font-medium leading-relaxed text-foreground">{item.title}</p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {item.userNickname} · {item.likeCount} 赞
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {/* ─── 底部操作栏 ─── */}
      {post.moderationStatus === 0 && (
        <ActionBar
          commentText={commentText}
          replyTarget={replyTarget}
          isCommentSubmitting={isCommentSubmitting}
          isLikeSubmitting={isLikeSubmitting}
          isFavoriteSubmitting={isFavoriteSubmitting}
          isLiked={post.isLiked}
          isFavorited={post.isFavorited}
          onCommentTextChange={setCommentText}
          onSubmitComment={() => void handleSubmitComment()}
          onClearReply={() => setReplyTarget(null)}
          onLike={() => void handleLike()}
          onFavorite={() => void handleFavorite()}
          onShare={() => void handleShare()}
        />
      )}

      {showFullscreen && (
        <ImageFullscreenViewer
          images={displayImages}
          initialIndex={fullscreenIndex}
          onClose={() => setShowFullscreen(false)}
        />
      )}

      {/* 发起申诉（U34：统一 AppDialog） */}
      <AppealDialog
        post={post}
        isOpen={isAppealOpen}
        isSubmitting={isAppealSubmitting}
        reason={appealReason}
        onReasonChange={setAppealReason}
        onSubmit={() => void handleSubmitAppeal()}
        onClose={() => { setIsAppealOpen(false); setAppealReason('') }}
      />

      {/* 拉黑评论作者（G6：破坏性操作统一 ConfirmDialog） */}
      <ConfirmDialog
        open={pendingBlockComment !== null}
        title={`拉黑 @${pendingBlockComment?.userNickname ?? '该用户'}？`}
        description="拉黑后双方内容互不可见、不能互发私信，并自动取消双方关注。"
        confirmText="拉黑"
        destructive
        isSubmitting={isBlockSubmitting}
        onConfirm={() => void handleBlockComment()}
        onCancel={() => setPendingBlockComment(null)}
      />
    </div>
    </div>
  )
}
