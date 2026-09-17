import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Heart, Home, Loader2, MessageSquare, Pencil, Trash2, UserCheck, UserPlus } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Textarea } from '@/components/ui/textarea'
import { getAccessToken, getTokenUserId } from '@/services/http'
import { getCurrentUserProfile, type UserProfile } from '@/services/auth'
import { getMyPosts, getUserFavorites, getUserLikes, getUserPosts, getUserProfile, toggleFollow } from '@/services/users'
import { startConversation } from '@/services/messages'
import { smartBack } from '@/lib/smart-back'
import { deletePost, createPostAppeal, type ApiPostSummary } from '@/services/posts'

type ProfileTab = 'posts' | 'favorites' | 'likes'

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: 'posts', label: '分享' },
  { key: 'favorites', label: '收藏' },
  { key: 'likes', label: '赞过' },
]

/** 帖子网格卡片（manageable 时显示编辑/删除操作与审核状态徽标；已封禁帖子提供申诉入口） */
function PostGridItem({ post, manageable, onDeleteRequest, onAppealRequest }: {
  post: ApiPostSummary
  manageable: boolean
  onDeleteRequest: (post: ApiPostSummary) => void
  onAppealRequest: (post: ApiPostSummary) => void
}) {
  const navigate = useNavigate()
  const cover = post.thumbnails?.[0] ?? post.images[0]
  const isBanned = post.moderationStatus === 2
  const statusBadge = post.moderationStatus === 1
    ? { text: '审核中', className: 'bg-yellow-500/90' }
    : isBanned
      ? { text: '已下架', className: 'bg-destructive/90' }
      : null
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => navigate(`/posts/${post.id}`, { state: { modal: true } })}
        className="group w-full overflow-hidden rounded-xl border border-border/60 bg-card text-left transition-all hover:-translate-y-0.5 hover:border-coral/20 hover:shadow-lg"
      >
        <div className="relative aspect-[3/4] bg-muted">
          {cover?.startsWith('http') && (
            <img
              src={cover}
              alt={post.title}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(event) => { event.currentTarget.style.display = 'none' }}
            />
          )}
          {statusBadge && (
            <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] text-white ${statusBadge.className}`}>
              {statusBadge.text}
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-relaxed text-foreground">{post.title}</h3>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Heart className="h-3.5 w-3.5" />
            <span>{post.likeCount}</span>
          </div>
        </div>
      </button>
      {manageable && (
        <div className="absolute right-1.5 top-1.5 flex gap-1">
          {isBanned ? (
            post.appealStatus === 0 ? (
              <span className="flex h-6 items-center rounded-full bg-black/60 px-2 text-[10px] text-white">申诉中</span>
            ) : (
              <button
                type="button"
                aria-label="发起申诉"
                onClick={() => onAppealRequest(post)}
                className="flex h-6 items-center justify-center rounded-full bg-black/60 px-2 text-[10px] text-white transition-colors hover:bg-coral"
              >
                申诉
              </button>
            )
          ) : (
            <button
              type="button"
              aria-label="编辑帖子"
              onClick={() => navigate(`/posts/${post.id}/edit`)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            aria-label="删除帖子"
            onClick={() => onDeleteRequest(post)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProfileScreen({ self = false }: { self?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ userId: string }>()
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<ApiPostSummary[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isListLoading, setIsListLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false)
  const [isStartingChat, setIsStartingChat] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ApiPostSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [appealTarget, setAppealTarget] = useState<ApiPostSummary | null>(null)
  const [appealReason, setAppealReason] = useState('')
  const [isAppealSubmitting, setIsAppealSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const profileRef = useRef<UserProfile | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const isLoggedIn = getAccessToken() != null
  const isOwn = self || (profile != null && getTokenUserId() === profile.id)

  const loadPage = useCallback(async (nextCursor?: string, append = false) => {
    if (!self && !params.userId) return
    if (append) {
      setIsLoadingMore(true)
    } else {
      setError(null)
      if (profileRef.current == null) {
        setIsLoading(true)
      } else {
        setIsListLoading(true)
      }
    }
    try {
      const targetProfile = profileRef.current
        ?? (self ? await getCurrentUserProfile() : await getUserProfile(params.userId ?? ''))
      const page = activeTab === 'favorites'
        ? await getUserFavorites(targetProfile.id, nextCursor)
        : activeTab === 'likes'
          ? await getUserLikes(targetProfile.id, nextCursor)
          : self ? await getMyPosts(nextCursor) : await getUserPosts(targetProfile.id, nextCursor)
      profileRef.current = targetProfile
      setProfile(targetProfile)
      setPosts((current) => (append ? [...current, ...page.list] : page.list))
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载失败，请稍后重试')
    } finally {
      setIsLoading(false)
      setIsListLoading(false)
      setIsLoadingMore(false)
    }
  }, [self, params.userId, activeTab])

  useEffect(() => { void loadPage() }, [loadPage])

  // 触底自动加载更多
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore || isLoading) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore && cursor) {
          void loadPage(cursor, true)
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isLoading, isLoadingMore, cursor, loadPage])

  const handleFollow = async () => {
    if (!profile) return
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)
      return
    }
    setIsFollowSubmitting(true)
    try {
      const result = await toggleFollow(profile.id)
      const nextProfile: UserProfile = {
        ...profile,
        isFollowing: result.followed,
        followerCount: Math.max(profile.followerCount + (result.followed ? 1 : -1), 0),
      }
      profileRef.current = nextProfile
      setProfile(nextProfile)
      toast('success', result.followed ? '已关注' : '已取消关注')
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '操作失败')
    } finally {
      setIsFollowSubmitting(false)
    }
  }

  const handleStartChat = async () => {
    if (!profile) return
    setIsStartingChat(true)
    try {
      const conversation = await startConversation(profile.id)
      navigate(`/messages?c=${conversation.id}`)
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '无法发起私信')
    } finally {
      setIsStartingChat(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await deletePost(String(pendingDelete.id))
      setPosts((current) => current.filter((item) => item.id !== pendingDelete.id))
      setProfile((current) => {
        if (!current) return current
        const next = { ...current, postCount: Math.max(current.postCount - 1, 0) }
        profileRef.current = next
        return next
      })
      toast('success', '已删除')
      setPendingDelete(null)
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '删除失败')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubmitAppeal = async () => {
    if (!appealTarget) return
    setIsAppealSubmitting(true)
    try {
      await createPostAppeal(String(appealTarget.id), appealReason.trim())
      toast('success', '申诉已提交，等待管理员处理')
      setPosts((current) => current.map((item) => (
        item.id === appealTarget.id ? { ...item, appealStatus: 0 } : item
      )))
      setAppealTarget(null)
      setAppealReason('')
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '提交申诉失败')
    } finally {
      setIsAppealSubmitting(false)
    }
  }

  const emptyText = activeTab === 'favorites'
    ? '还没有收藏'
    : activeTab === 'likes'
      ? '还没有点赞'
      : isOwn ? '还没有发布分享' : '还没有公开分享'

  const navBar = (
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
        <h1 className="text-lg font-bold text-foreground">{self ? '我的主页' : '个人主页'}</h1>
      </div>
    </nav>
  )

  if (isLoading && !profile) {
    return (
      <div className="min-h-screen bg-background">
        {navBar}
        <main className="mx-auto max-w-5xl px-4 py-6">
          <Skeleton className="h-40 rounded-2xl" />
          <div className="mt-6 columns-2 gap-3 space-y-3 md:columns-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[3/4] break-inside-avoid rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-3 rounded-2xl border border-destructive/30 bg-card p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => void loadPage()}>重试</Button>
            <Button onClick={() => navigate('/')}>返回首页</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-background">
      {navBar}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar className="h-20 w-20 shrink-0">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.nickname} />}
              <AvatarFallback className="bg-coral-light text-2xl font-bold text-coral-contrast">
                {profile.nickname[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold text-foreground">{profile.nickname}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="mt-2 text-sm text-foreground/80">{profile.bio}</p>}
              <div className="mt-3 flex gap-6 text-sm">
                <button type="button" className="cursor-pointer" onClick={() => setActiveTab('posts')}>
                  <b className="text-foreground">{profile.postCount}</b> <span className="text-muted-foreground">分享</span>
                </button>
                <button type="button" className="cursor-pointer" onClick={() => navigate(`/user/${profile.id}/followers`)}>
                  <b className="text-foreground">{profile.followerCount}</b> <span className="text-muted-foreground">粉丝</span>
                </button>
                <button type="button" className="cursor-pointer" onClick={() => navigate(`/user/${profile.id}/following`)}>
                  <b className="text-foreground">{profile.followingCount}</b> <span className="text-muted-foreground">关注</span>
                </button>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 max-md:w-full">
              {isOwn ? (
                <Button variant="outline" onClick={() => navigate('/profile/edit')}>编辑资料</Button>
              ) : (
                <>
                  <Button
                    variant={profile.isFollowing ? 'outline' : 'default'}
                    className={`h-10 ${profile.isFollowing ? '' : 'bg-coral text-white hover:bg-coral-dark'}`}
                    disabled={isFollowSubmitting}
                    onClick={() => void handleFollow()}
                  >
                    {profile.isFollowing
                      ? <><UserCheck className="mr-1 h-4 w-4" />已关注</>
                      : <><UserPlus className="mr-1 h-4 w-4" />关注</>}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={isStartingChat}
                    onClick={() => void handleStartChat()}
                  >
                    <MessageSquare className="mr-1 h-4 w-4" />
                    私信
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div role="tablist" aria-label="帖子分类" className="sticky top-14 z-40 mb-4 flex border-b border-border bg-background">
            {PROFILE_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 border-b-2 px-3 pb-3 pt-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-coral text-coral'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {isListLoading ? (
            <div className="columns-2 gap-3 space-y-3 md:columns-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[3/4] break-inside-avoid rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {posts.length === 0 && (
                <p className="rounded-xl bg-card p-12 text-center text-sm text-muted-foreground">{emptyText}</p>
              )}
              <div className="columns-2 gap-3 space-y-3 md:columns-3">
                {posts.map((post) => (
                  <div key={post.id} className="break-inside-avoid">
                    <PostGridItem
                      post={post}
                      manageable={isOwn && activeTab === 'posts'}
                      onDeleteRequest={setPendingDelete}
                      onAppealRequest={setAppealTarget}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
          <div ref={loadMoreRef} className="py-8 text-center">
            {isLoadingMore && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}
            {!hasMore && posts.length > 0 && <span className="text-xs text-muted-foreground">已经到底啦</span>}
          </div>
        </section>
      </main>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="删除帖子确认"
        >
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6">
            <h3 className="text-lg font-bold text-foreground">删除这条分享？</h3>
            <p className="text-sm text-muted-foreground">「{pendingDelete.title}」删除后不可恢复。</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={isDeleting} onClick={() => setPendingDelete(null)}>
                取消
              </Button>
              <Button
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={() => void handleConfirmDelete()}
              >
                {isDeleting ? '删除中...' : '删除'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {appealTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="发起申诉"
        >
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6">
            <h3 className="text-lg font-bold text-foreground">发起申诉</h3>
            <p className="text-sm text-muted-foreground">
              「{appealTarget.title}」已被下架，无法修改。提交申诉后由管理员复核，请说明理由。
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
              <Button variant="outline" disabled={isAppealSubmitting} onClick={() => { setAppealTarget(null); setAppealReason('') }}>
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
