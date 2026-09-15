import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Heart, Loader2, UserCheck, UserPlus } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { getAccessToken, getTokenUserId } from '@/services/http'
import { getCurrentUserProfile, type UserProfile } from '@/services/auth'
import { getUserPosts, getUserProfile, toggleFollow } from '@/services/users'
import { smartBack } from '@/lib/smart-back'
import type { ApiPostSummary } from '@/services/posts'

/** 帖子网格卡片 */
function PostGridItem({ post }: { post: ApiPostSummary }) {
  const navigate = useNavigate()
  const cover = post.thumbnails?.[0] ?? post.images[0]
  return (
    <button
      type="button"
      onClick={() => navigate(`/posts/${post.id}`)}
      className="group w-full overflow-hidden rounded-xl border border-border/60 bg-card text-left transition-all hover:-translate-y-0.5 hover:border-coral/20 hover:shadow-lg"
    >
      <div
        className="aspect-[3/4] bg-muted"
        style={cover?.startsWith('http') ? { background: `url(${cover}) center / cover` } : undefined}
      />
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-relaxed text-foreground">{post.title}</h3>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Heart className="h-3.5 w-3.5" />
          <span>{post.likeCount}</span>
        </div>
      </div>
    </button>
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
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const profileRef = useRef<UserProfile | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const isLoggedIn = getAccessToken() != null
  const isOwn = self || (profile != null && getTokenUserId() === profile.id)

  const loadPage = useCallback(async (nextCursor?: string, append = false) => {
    if (!self && !params.userId) return
    if (append) setIsLoadingMore(true)
    else {
      setIsLoading(true)
      setError(null)
    }
    try {
      const targetProfile = profileRef.current
        ?? (self ? await getCurrentUserProfile() : await getUserProfile(params.userId ?? ''))
      const page = await getUserPosts(targetProfile.id, nextCursor)
      profileRef.current = targetProfile
      setProfile(targetProfile)
      setPosts((current) => (append ? [...current, ...page.list] : page.list))
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载失败，请稍后重试')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [self, params.userId])

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

  const navBar = (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Button aria-label="返回上一页" variant="ghost" size="icon" onClick={() => smartBack()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">{self ? '我的主页' : '个人主页'}</h1>
      </div>
    </nav>
  )

  if (isLoading) {
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
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 shrink-0">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.nickname} />}
              <AvatarFallback className="bg-coral-light text-2xl font-bold text-coral">
                {profile.nickname[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold text-foreground">{profile.nickname}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="mt-2 text-sm text-foreground/80">{profile.bio}</p>}
              <div className="mt-3 flex gap-6 text-sm">
                <span><b className="text-foreground">{profile.postCount}</b> <span className="text-muted-foreground">分享</span></span>
                <span><b className="text-foreground">{profile.followerCount}</b> <span className="text-muted-foreground">粉丝</span></span>
                <span><b className="text-foreground">{profile.followingCount}</b> <span className="text-muted-foreground">关注</span></span>
              </div>
            </div>
            <div className="shrink-0">
              {isOwn ? (
                <Button variant="outline" onClick={() => toast('info', '编辑资料功能开发中')}>编辑资料</Button>
              ) : (
                <Button
                  variant={profile.isFollowing ? 'outline' : 'default'}
                  className={profile.isFollowing ? '' : 'bg-coral text-white hover:bg-coral-dark'}
                  disabled={isFollowSubmitting}
                  onClick={() => void handleFollow()}
                >
                  {profile.isFollowing
                    ? <><UserCheck className="mr-1 h-4 w-4" />已关注</>
                    : <><UserPlus className="mr-1 h-4 w-4" />关注</>}
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <h3 className="mb-3 text-lg font-bold text-foreground">分享</h3>
          {posts.length === 0 && (
            <p className="rounded-xl bg-card p-12 text-center text-sm text-muted-foreground">还没有公开分享</p>
          )}
          <div className="columns-2 gap-3 space-y-3 md:columns-3">
            {posts.map((post) => (
              <div key={post.id} className="break-inside-avoid">
                <PostGridItem post={post} />
              </div>
            ))}
          </div>
          <div ref={loadMoreRef} className="py-8 text-center">
            {isLoadingMore && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}
            {!hasMore && posts.length > 0 && <span className="text-xs text-muted-foreground">已经到底啦</span>}
          </div>
        </section>
      </main>
    </div>
  )
}
