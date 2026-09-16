import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Flag, Heart, Home, MessageCircle, Pencil, Send } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { smartBack } from '@/lib/smart-back'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { createComment, getComments, type ApiComment } from '@/services/comments'
import { ApiError, getTokenUserId } from '@/services/http'
import { getPost, createPostAppeal, toggleFavorite, toggleLike, type ApiPost } from '@/services/posts'
import { createContentReport } from '@/services/reports'
import { ImageFullscreenViewer } from '@/components/image-fullscreen-viewer'
import { PostStructuredData } from '@/components/structured-data'
import { useToast } from '@/components/ui/toast'
import { trackPostView, trackPostLike, trackPostFavorite, trackCommentCreate } from '@/services/analytics'

function imageBackground(image?: string): string {
  if (image?.startsWith('http')) {
    const encoded = encodeURI(image).replace(/[()]/g, encodeURIComponent)
    return `url("${encoded}") center / cover`
  }
  return image || 'linear-gradient(135deg,#fecdd3,#fda4af)'
}

/* ─── 图片轮播组件 ─── */
function PostImageCarousel({ images, title, onImageClick }: { images: string[]; title: string; onImageClick?: (index: number) => void }) {
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
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') scrollTo(activeIndex - 1)
          if (e.key === 'ArrowRight') scrollTo(activeIndex + 1)
        }}
        tabIndex={0}
        className="flex snap-x snap-mandatory overflow-x-hidden outline-none focus-visible:ring-2 focus-visible:ring-coral"
        role="region"
        aria-label={`${title} 商品图片`}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className="w-full flex-none snap-center bg-muted cursor-zoom-in"
            style={{ aspectRatio: '4 / 3', background: imageBackground(image) }}
            onClick={() => onImageClick?.(index)}
          />
        ))}
      </div>

      {hasMultiple && activeIndex > 0 && (
        <button
          type="button"
          onClick={() => scrollTo(activeIndex - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-md transition-opacity hover:bg-white"
          aria-label="上一张图片"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {hasMultiple && activeIndex < images.length - 1 && (
        <button
          type="button"
          onClick={() => scrollTo(activeIndex + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-md transition-opacity hover:bg-white"
          aria-label="下一张图片"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollTo(index)}
              className={`block h-1.5 rounded-full transition-all ${
                index === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`跳转到第 ${index + 1} 张图片`}
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
  const { toast } = useToast()
  const [post, setPost] = useState<ApiPost | null>(null)
  const [comments, setComments] = useState<ApiComment[]>([])
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
      toast('success', result.favorited ? '已收藏' : '已取消收藏')
    } catch (requestError) {
      handleActionError(requestError, '收藏失败')
    } finally {
      setIsFavoriteSubmitting(false)
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

  if (isLoading) return (
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
  if (!post || loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
        <p className="mb-2 text-lg font-semibold text-foreground">{loadError ? '加载失败' : '帖子不存在'}</p>
        <p className="mb-6 text-sm text-muted-foreground">{loadError ?? '该帖子可能已被删除或无权查看'}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => void load()}>重新加载</Button>
          <Button onClick={() => navigate('/')} className="bg-coral text-white hover:bg-coral-dark">返回首页</Button>
        </div>
      </div>
    )
  }

  // JSON-LD 结构化数据（SEO）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: post.title,
    articleBody: post.content.substring(0, 200),
    author: {
      '@type': 'Person',
      name: post.userNickname,
    },
    datePublished: post.createdAt,
    interactionStatistic: [
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: post.likeCount },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: post.commentCount },
    ],
    ...(post.images.length > 0 ? { image: post.images } : {}),
  }

  const fallbackImages = ['linear-gradient(135deg,#fecdd3,#fda4af)']
  const displayImages = post.images.length > 0 ? post.images : fallbackImages

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ─── 结构化数据 ─── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── 顶部导航 ─── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 md:top-14">
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
              <AvatarFallback className="bg-coral-light text-[10px] text-coral">
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
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ─── 底部操作栏 ─── */}
      {post.moderationStatus === 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
            <div className="relative flex-1">
              <Input
                aria-label="评论内容"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSubmitComment() } }}
                placeholder={replyTarget ? `回复 ${replyTarget.userNickname ?? '用户'}...` : '说点什么...'}
                className="h-10 rounded-full bg-muted/50 pr-10"
              />
              <Button
                aria-label="发送评论"
                disabled={isCommentSubmitting || !commentText.trim()}
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-coral text-white hover:bg-coral-dark disabled:opacity-40"
                onClick={() => void handleSubmitComment()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button aria-label={post.isLiked ? '取消点赞' : '点赞'} disabled={isLikeSubmitting} variant="ghost" size="icon" onClick={() => void handleLike()}>
              <Heart className={`h-5 w-5 ${post.isLiked ? 'fill-coral text-coral' : ''}`} />
            </Button>
            <Button aria-label={post.isFavorited ? '取消收藏' : '收藏'} disabled={isFavoriteSubmitting} variant="ghost" size="icon" onClick={() => void handleFavorite()}>
              <Bookmark className={`h-5 w-5 ${post.isFavorited ? 'fill-coral text-coral' : ''}`} />
            </Button>
          </div>
          {replyTarget && (
            <div className="mx-auto max-w-5xl px-4 pb-2">
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="flex items-center gap-1 text-xs text-coral hover:underline"
              >
                回复 {replyTarget.userNickname ?? '用户'} ×
              </button>
            </div>
          )}
        </div>
      )}

      {showFullscreen && (
        <ImageFullscreenViewer
          images={displayImages}
          initialIndex={fullscreenIndex}
          onClose={() => setShowFullscreen(false)}
        />
      )}

      {isAppealOpen && post && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="发起申诉"
        >
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6">
            <h3 className="text-lg font-bold text-foreground">发起申诉</h3>
            <p className="text-sm text-muted-foreground">
              「{post.title}」已被下架，无法修改。提交申诉后由管理员复核，请说明理由。
            </p>
            <Textarea
              value={appealReason}
              maxLength={500}
              onChange={(event) => setAppealReason(event.target.value)}
              className="min-h-24"
              placeholder="申诉理由（必填，最多500字）"
              aria-label="申诉理由"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={isAppealSubmitting}
                onClick={() => { setIsAppealOpen(false); setAppealReason('') }}
              >
                取消
              </Button>
              <Button
                className="bg-coral text-white hover:bg-coral-dark"
                disabled={isAppealSubmitting || !appealReason.trim()}
                onClick={() => void handleSubmitAppeal()}
              >
                {isAppealSubmitting ? '提交中...' : '提交申诉'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── 帖子内容子组件 ─── */
function PostContent({ post }: { post: ApiPost }) {
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{post.title}</h1>
      <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{post.content}</p>
      {post.productName && (
        <div className="mb-4 rounded-xl border border-border/60 bg-background p-4">
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
    </>
  )
}
