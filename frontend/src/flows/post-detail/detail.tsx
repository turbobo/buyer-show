import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Flag, Heart, Send } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { createComment, getComments, type ApiComment } from '@/services/comments'
import { ApiError } from '@/services/http'
import { getPost, toggleFavorite, toggleLike, type ApiPost } from '@/services/posts'
import { createContentReport } from '@/services/reports'

function imageBackground(image?: string): string {
  if (image?.startsWith('http')) {
    const encoded = encodeURI(image).replace(/[()]/g, encodeURIComponent)
    return `url("${encoded}") center / cover`
  }
  return image || 'linear-gradient(135deg,#fecdd3,#fda4af)'
}

/* ─── 图片轮播组件 ─── */
function PostImageCarousel({ images, title }: { images: string[]; title: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const hasMultiple = images.length > 1

  const scrollTo = (index: number) => {
    const el = scrollRef.current
    if (!el) return
    const target = Math.max(0, Math.min(index, images.length - 1))
    el.scrollTo({ left: el.offsetWidth * target, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.offsetWidth)
    setActiveIndex(Math.max(0, Math.min(index, images.length - 1)))
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-hidden"
        role="region"
        aria-label={`${title} 商品图片`}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className="w-full flex-none snap-center bg-muted"
            style={{ aspectRatio: '1 / 1', background: imageBackground(image) }}
          />
        ))}
      </div>

      {/* 左右箭头 */}
      {hasMultiple && activeIndex > 0 && (
        <button
          type="button"
          onClick={() => scrollTo(activeIndex - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md transition-opacity hover:bg-white"
          aria-label="上一张图片"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {hasMultiple && activeIndex < images.length - 1 && (
        <button
          type="button"
          onClick={() => scrollTo(activeIndex + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md transition-opacity hover:bg-white"
          aria-label="下一张图片"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* 圆点指示器 */}
      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((_, index) => (
            <span
              key={index}
              className={`block h-1.5 rounded-full transition-all ${
                index === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── 评论项组件 ─── */
interface CommentItemProps {
  comment: ApiComment
  onReply: (comment: ApiComment) => void
  onReport: (commentId: number) => void
}

function CommentItem({ comment, onReply, onReport }: CommentItemProps) {
  const isRoot = comment.parentId == null
  return (
    <div className="flex gap-3">
      <Avatar className="mt-0.5 h-8 w-8 shrink-0">
        <AvatarFallback className="bg-coral-light text-xs font-bold text-coral">
          {comment.userNickname?.[0] ?? '用'}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.userNickname ?? `用户${comment.userId}`}</span>
          <span className="text-xs text-muted-foreground">{comment.createdAt}</span>
          {comment.moderationStatus === 1 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">待审核</span>
          )}
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">{comment.content}</p>
        <div className="mt-1.5 flex gap-4">
          {isRoot && (
            <button type="button" onClick={() => onReply(comment)} className="text-xs text-muted-foreground hover:text-coral">
              回复
            </button>
          )}
          <button type="button" onClick={() => onReport(comment.id)} className="text-xs text-muted-foreground hover:text-coral">
            举报
          </button>
        </div>
        {comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-border/60 pl-4">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} onReply={onReply} onReport={onReport} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && [1002, 1003, 1007].includes(error.code)
}

/* ─── 详情页主组件 ─── */
export default function PostDetailScreen() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [post, setPost] = useState<ApiPost | null>(null)
  const [comments, setComments] = useState<ApiComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [replyTarget, setReplyTarget] = useState<ApiComment | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false)
  const [isFavoriteSubmitting, setIsFavoriteSubmitting] = useState(false)

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
      setComments(postData.moderationStatus === 0 ? await getComments(postId) : [])
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
    setActionMessage(error instanceof Error ? error.message : fallback)
  }

  const handleSubmitComment = async () => {
    if (!postId || !commentText.trim() || isCommentSubmitting) return
    setIsCommentSubmitting(true)
    setActionMessage(null)
    try {
      const comment = await createComment(postId, commentText.trim(), replyTarget?.id)
      setCommentText('')
      setReplyTarget(null)
      setComments((current) => replyTarget
        ? current.map((item) => item.id === replyTarget.id
          ? { ...item, replies: [...item.replies, comment] }
          : item)
        : [...current, comment])
      setActionMessage(comment.moderationStatus === 1 ? '评论已提交，审核通过后公开展示' : '评论发布成功')
    } catch (requestError) {
      handleActionError(requestError, '评论发布失败')
    } finally {
      setIsCommentSubmitting(false)
    }
  }

  const handleLike = async () => {
    if (!postId || isLikeSubmitting) return
    setIsLikeSubmitting(true)
    setActionMessage(null)
    try {
      const result = await toggleLike(postId)
      setPost((current) => current && ({
        ...current,
        isLiked: result.liked,
        likeCount: Math.max(0, current.likeCount + (result.liked ? 1 : -1)),
      }))
    } catch (requestError) {
      handleActionError(requestError, '点赞失败')
    } finally {
      setIsLikeSubmitting(false)
    }
  }

  const handleFavorite = async () => {
    if (!postId || isFavoriteSubmitting) return
    setIsFavoriteSubmitting(true)
    setActionMessage(null)
    try {
      const result = await toggleFavorite(postId)
      setPost((current) => current && ({
        ...current,
        isFavorited: result.favorited,
        favoriteCount: Math.max(0, current.favoriteCount + (result.favorited ? 1 : -1)),
      }))
    } catch (requestError) {
      handleActionError(requestError, '收藏失败')
    } finally {
      setIsFavoriteSubmitting(false)
    }
  }

  const handleReport = async (contentType: 'POST' | 'COMMENT', contentId: number) => {
    try {
      await createContentReport(contentType, contentId, '用户举报')
      setActionMessage('举报已提交，管理员将尽快处理')
    } catch (requestError) {
      handleActionError(requestError, '举报提交失败')
    }
  }

  if (isLoading) return <div className="min-h-screen bg-warm-bg p-8 text-center text-muted-foreground">加载中...</div>
  if (!post || loadError) {
    return <div className="min-h-screen bg-warm-bg p-8 text-center"><p className="mb-4 text-destructive">{loadError ?? '帖子不存在'}</p><Button onClick={() => void load()}>重新加载</Button></div>
  }

  const fallbackImages = ['linear-gradient(135deg,#fecdd3,#fda4af)']
  const displayImages = post.images.length > 0 ? post.images : fallbackImages

  return (
    <div className="min-h-screen bg-warm-bg pb-20">
      <nav className="sticky top-0 z-50 border-b border-border bg-white/95">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Button aria-label="返回上一页" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-coral-light text-[10px] text-coral">
              {post.userNickname?.[0] ?? '?'}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 text-sm font-medium">{post.userNickname}</span>
          {post.moderationStatus === 0 && (
            <Button aria-label="举报帖子" variant="ghost" size="icon" onClick={() => void handleReport('POST', post.id)}>
              <Flag className="h-5 w-5" />
            </Button>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl p-4 py-6">
        {post.moderationStatus === 1 && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">该帖子正在审核，仅作者可见。</p>
        )}
        {actionMessage && (
          <p className="mb-4 rounded-lg bg-muted p-3 text-sm text-foreground/80">{actionMessage}</p>
        )}

        <article className="overflow-hidden rounded-2xl border border-border/60 bg-white">
          <div className="grid md:grid-cols-2">
            {/* 图片轮播区 */}
            <PostImageCarousel images={displayImages} title={post.title} />

            {/* 内容区 */}
            <div className="p-5">
              <h1 className="mb-4 text-2xl font-bold">{post.title}</h1>
              <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{post.content}</p>

              {post.productName && (
                <div className="mb-4 rounded-xl border border-border/60 bg-warm-bg p-4">
                  <p className="font-semibold">{post.productName}</p>
                  <p className="mt-1 text-coral">¥{post.productPrice ?? '—'} · {post.productSource ?? '未知来源'}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => <span key={tag} className="text-xs text-coral">#{tag}</span>)}
              </div>

              <Separator className="my-4" />
              <p className="text-sm text-muted-foreground">
                {post.likeCount} 赞 · {post.commentCount} 评论 · {post.favoriteCount} 收藏
              </p>
              <Separator className="my-4" />

              <h2 className="mb-4 font-semibold">评论</h2>
              <div className="max-h-96 space-y-4 overflow-y-auto">
                {comments.length === 0
                  ? <p className="text-sm text-muted-foreground">还没有公开评论</p>
                  : comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onReply={setReplyTarget}
                      onReport={(commentId) => void handleReport('COMMENT', commentId)}
                    />
                  ))
                }
              </div>
            </div>
          </div>
        </article>
      </main>

      {/* 底部操作栏 */}
      {post.moderationStatus === 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-white/95">
          <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
            <Input
              aria-label="评论内容"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={replyTarget ? `回复 ${replyTarget.userNickname ?? '用户'}...` : '说点什么...'}
            />
            <Button aria-label="发送评论" disabled={isCommentSubmitting} size="icon" onClick={() => void handleSubmitComment()}>
              <Send className="h-4 w-4" />
            </Button>
            <Button aria-label={post.isLiked ? '取消点赞' : '点赞'} disabled={isLikeSubmitting} variant="ghost" size="icon" onClick={() => void handleLike()}>
              <Heart className={`h-5 w-5 ${post.isLiked ? 'fill-coral text-coral' : ''}`} />
            </Button>
            <Button aria-label={post.isFavorited ? '取消收藏' : '收藏'} disabled={isFavoriteSubmitting} variant="ghost" size="icon" onClick={() => void handleFavorite()}>
              <Bookmark className={`h-5 w-5 ${post.isFavorited ? 'fill-coral text-coral' : ''}`} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
