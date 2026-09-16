import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { getAccessToken, getTokenUserId } from '@/services/http'
import { getFollowers, getFollowing, toggleFollow, type FollowUser } from '@/services/users'
import { smartBack } from '@/lib/smart-back'

/**
 * 关注/粉丝列表页。
 * 路由：`/user/:userId/followers`（mode=followers）、`/user/:userId/following`（mode=following）。
 */
export default function FollowListScreen({ mode }: { mode: 'followers' | 'following' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ userId: string }>()
  const { toast } = useToast()
  const [users, setUsers] = useState<FollowUser[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const myId = getTokenUserId()

  const loadPage = useCallback(async (nextCursor?: string, append = false) => {
    if (!params.userId) return
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
      setError(null)
    }
    try {
      const page = mode === 'followers'
        ? await getFollowers(params.userId, nextCursor)
        : await getFollowing(params.userId, nextCursor)
      setUsers((current) => (append ? [...current, ...page.list] : page.list))
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载失败，请稍后重试')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [mode, params.userId])

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

  const handleToggleFollow = async (user: FollowUser) => {
    if (!getAccessToken()) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)
      return
    }
    setSubmittingId(user.id)
    try {
      const result = await toggleFollow(user.id)
      setUsers((current) => current.map((item) => (
        item.id === user.id ? { ...item, isFollowing: result.followed } : item
      )))
      toast('success', result.followed ? '已关注' : '已取消关注')
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '操作失败')
    } finally {
      setSubmittingId(null)
    }
  }

  const title = mode === 'followers' ? '粉丝' : '关注'
  const emptyText = mode === 'followers' ? '还没有粉丝' : '还没有关注的人'

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Button aria-label="返回上一页" variant="ghost" size="icon" onClick={() => smartBack()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">{title}</h1>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[68px] rounded-xl" />
            ))}
          </div>
        ) : error && users.length === 0 ? (
          <div className="mx-auto max-w-sm space-y-3 rounded-2xl border border-destructive/30 bg-card p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => void loadPage()}>重试</Button>
              <Button onClick={() => navigate('/')}>返回首页</Button>
            </div>
          </div>
        ) : users.length === 0 ? (
          <p className="rounded-xl bg-card p-12 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-3">
            {users.map((user) => (
              <li key={user.id}>
                <div
                  role="link"
                  tabIndex={0}
                  aria-label={`${user.nickname} 的主页`}
                  onClick={() => navigate(`/user/${user.id}`)}
                  onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/user/${user.id}`) }}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition-colors hover:border-coral/20"
                >
                  <Avatar className="h-11 w-11 shrink-0">
                    {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.nickname} />}
                    <AvatarFallback className="bg-coral-light text-sm font-bold text-coral">
                      {user.nickname[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{user.nickname}</p>
                    {user.bio && <p className="truncate text-xs text-muted-foreground">{user.bio}</p>}
                  </div>
                  {user.id === myId ? (
                    <span className="shrink-0 text-xs text-muted-foreground">你</span>
                  ) : (
                    <Button
                      size="sm"
                      variant={user.isFollowing ? 'outline' : 'default'}
                      className={`shrink-0 ${user.isFollowing ? '' : 'bg-coral text-white hover:bg-coral-dark'}`}
                      disabled={submittingId === user.id}
                      onClick={(event) => { event.stopPropagation(); void handleToggleFollow(user) }}
                    >
                      {user.isFollowing ? (user.mutual ? '互相关注' : '已关注') : '关注'}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div ref={loadMoreRef} className="py-8 text-center">
          {isLoadingMore && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}
          {!hasMore && users.length > 0 && <span className="text-xs text-muted-foreground">已经到底啦</span>}
        </div>
      </main>
    </div>
  )
}
