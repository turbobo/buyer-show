import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { Clock, Loader2, Moon, Plus, Search, Sun, TrendingUp, Users, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getFeed, type ApiPostSummary, type CursorPage } from '@/services/posts'
import { getHotTagStats, type TagStat } from '@/services/tags'
import { CHANNELS, TABBAR_ORDER, PC_CHANNEL_ORDER, isChannelActive, type ChannelKey } from '@/lib/navigation'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorState } from '@/components/ui/error-state'
import { clearTokens, getTokenRole } from '@/services/http'
import { useUiStore } from '@/stores/ui-store'
import { useToast } from '@/components/ui/toast'
import { UserMenu } from '@/components/layout/user-menu'
import { useUnreadCount } from '@/hooks/use-unread-count'
import { useTheme } from '@/hooks/use-theme'
import { useMe, useSessionCache } from '@/hooks/use-me'
import { PostCard } from './post-card'
import { SearchPanel } from './search-panel'
import { distributePosts, useColumnCount } from './waterfall'

type TabKey = ChannelKey

const PULL_THRESHOLD = 56

/** Feed 排序三档（G1 新增「关注」：登录后看关注对象的动态时间线） */
const SORT_OPTIONS = [
  { key: 'new', label: '最新', icon: Clock },
  { key: 'hot', label: '热门', icon: TrendingUp },
  { key: 'following', label: '关注', icon: Users },
] as const
type FeedSort = (typeof SORT_OPTIONS)[number]['key']

export default function HomeFeedScreen() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { theme, toggleTheme } = useTheme()
  const queryClient = useQueryClient()
  const [activeTag, setActiveTag] = useState('全部')
  const [feedSort, setFeedSort] = useState<FeedSort>('new')
  const isFollowingFeed = feedSort === 'following'
  const feedTag = activeTag === '全部' ? undefined : activeTag
  const feedQueryKey = ['feed', feedTag, feedSort] as const
  // Feed 游标分页（P4.1）：按 标签+排序 独立缓存，返回列表秒开；切换时保留旧数据避免闪烁；
  // 旧请求由 AbortSignal 自动取消（替代原 requestVersion 手动版本守卫）；关注流（G1）传 scope=following
  const feedQuery = useInfiniteQuery({
    queryKey: feedQueryKey,
    queryFn: ({ pageParam, signal }) =>
      getFeed(pageParam, feedTag, isFollowingFeed ? 'new' : feedSort, isFollowingFeed ? 'following' : 'all', signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
  const posts = useMemo(() => feedQuery.data?.pages.flatMap((page) => page.list) ?? [], [feedQuery.data])
  const columnCount = useColumnCount()
  const distributedColumns = useMemo(() => distributePosts(posts, columnCount), [posts, columnCount])
  const hasMore = feedQuery.hasNextPage
  const isInitialLoading = feedQuery.isPending
  const isFetchingMore = feedQuery.isFetchingNextPage
  const feedError = feedQuery.error instanceof Error ? feedQuery.error.message : null
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [hotTagStats, setHotTagStats] = useState<TagStat[]>([])
  // 当前用户资料（P4.1：全站共享缓存，与 Header/UserMenu 同一事实源）
  const { currentUser } = useMe()
  const { clearSessionCache } = useSessionCache()
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const unreadCount = useUnreadCount()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [pullY, setPullY] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pullYRef = useRef(0)

  // 热门标签（真实聚合；接口为空时仅显示「全部」）
  useEffect(() => {
    getHotTagStats().then(setHotTagStats).catch(() => { /* 保持空列表 */ })
  }, [])

  const refreshFeed = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    // 下拉刷新语义：重拉第一页后丢弃后续旧页（与替换式加载一致，滚动后按新游标继续）
    await feedQuery.refetch()
    queryClient.setQueryData<InfiniteData<CursorPage<ApiPostSummary>>>(feedQueryKey, (old) => (
      old ? { pages: [old.pages[0]], pageParams: [old.pageParams[0]] } : old
    ))
    setIsRefreshing(false)
  }, [isRefreshing, feedQuery, queryClient, feedQueryKey])

  // 下拉刷新（移动端触屏）：顶部下拉超过阈值后重新加载
  useEffect(() => {
    let startY: number | null = null
    const onTouchStart = (event: TouchEvent) => {
      startY = window.scrollY <= 0 ? event.touches[0].clientY : null
    }
    const onTouchMove = (event: TouchEvent) => {
      if (startY == null || window.scrollY > 0) return
      const delta = event.touches[0].clientY - startY
      if (delta <= 0) return
      const next = Math.min(delta * 0.5, 80)
      pullYRef.current = next
      setPullY(next)
    }
    const onTouchEnd = () => {
      if (pullYRef.current >= PULL_THRESHOLD) void refreshFeed()
      pullYRef.current = 0
      setPullY(0)
      startY = null
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [refreshFeed])

  // 触底自动加载更多（标签切换中 isPlaceholderData 时不触发，避免用旧游标请求新查询）
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore || feedQuery.isPlaceholderData) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingMore) {
          void feedQuery.fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isFetchingMore, feedQuery.isPlaceholderData, feedQuery.fetchNextPage])

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const location = useLocation()

  // 登出确认弹窗：Esc 关闭
  useEffect(() => {
    if (!showLogoutConfirm) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowLogoutConfirm(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showLogoutConfirm])

  const handleConfirmLogout = () => {
    setIsLoggingOut(true)
    clearTokens()
    clearSessionCache()
    useUiStore.getState().setUnreadCount(0)
    setIsLoggingOut(false)
    setShowLogoutConfirm(false)
    // 关注流需登录，登出后回退「最新」档避免请求 1003 错误态
    if (feedSort === 'following') setFeedSort('new')
    toast('success', '已退出登录')
    // 受保护路由登出后回首页；公开页（首页）原地切换为游客态
    if (/^\/(profile|publish|messages|notifications|admin)(\/|$)/.test(location.pathname)) {
      navigate('/')
    }
  }

  const handleTabClick = (tab: TabKey) => {
    setActiveTab(tab)
    const channel = CHANNELS[tab]
    if (tab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (tab === 'search') {
      setIsSearchFocused(true)
      document.getElementById('search-input')?.focus()
      return
    }
    navigate(channel.to)
  }

  // 从其他页 TabBar「搜索」进入：自动聚焦搜索框并清除参数
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('focus') === 'search') {
      setIsSearchFocused(true)
      document.getElementById('search-input')?.focus()
      navigate('/', { replace: true })
    }
  }, [location.search, navigate])

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setIsSearchFocused(false)
    }
  }

  // 排序档切换：关注流需登录（后端仅对登录用户返回关注内容），未登录时引导登录
  const handleFeedSortChange = (key: FeedSort) => {
    if (key === 'following' && !currentUser) {
      toast('info', '登录后即可查看关注动态')
      navigate('/login')
      return
    }
    setFeedSort(key)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ─── 顶部导航栏 ─── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <button type="button" onClick={() => handleTabClick('home')} className="flex h-11 items-center gap-2" aria-label="返回首页">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="hidden text-lg font-bold sm:block">买家说</span>
          </button>
          <div className="hidden items-center gap-1 md:flex">
            {PC_CHANNEL_ORDER.map((key) => {
              const channel = CHANNELS[key]
              const Icon = channel.icon
              const active = isChannelActive(key, location.pathname)
              return (
                <Button
                  key={key}
                  variant={active ? 'secondary' : 'ghost'}
                  size="sm"
                  className="relative"
                  onClick={() => handleTabClick(key)}
                >
                  <Icon className="mr-1 h-4 w-4" />
                  {channel.label}
                  {key === 'messages' && unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              )
            })}
          </div>
          <div className="relative mx-auto max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                // 延迟关闭，让点击事件先触发
                setTimeout(() => setIsSearchFocused(false), 200)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit()
              }}
              placeholder="搜索好物、品牌、标签..."
              aria-label="搜索"
              className="h-10 rounded-full border-0 bg-muted/50 pl-10 pr-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="清除搜索内容"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {isSearchFocused && <SearchPanel query={searchQuery} onClose={() => setIsSearchFocused(false)} />}
          </div>
          {/* 右操作区双层分组（16/8）：工具组（主题/审核台） | 操作组（发布+身份区） */}
          <div className="ml-auto flex shrink-0 items-center gap-4">
            <div className="flex items-center gap-2">
              <Button aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'} variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              {currentUser && getTokenRole() === 'ADMIN' && (
                <Button className="hidden sm:inline-flex" variant="ghost" size="sm" onClick={() => navigate('/admin/moderation')}>
                  审核台
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                aria-label="发布分享"
                onClick={() => navigate('/publish')}
                className="h-10 rounded-full bg-coral px-3 text-white hover:bg-coral-dark sm:px-4"
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">发布</span>
              </Button>
              {currentUser ? (
                <div className="hidden sm:block">
                  <UserMenu user={currentUser} onLogoutRequest={() => setShowLogoutConfirm(true)} />
                </div>
              ) : (
                <Button className="hidden sm:inline-flex" variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  登录
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ─── 标签筛选栏 ─── */}
      <div className="sticky top-14 z-40 border-b border-border bg-card/80 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4">
          <div className="flex flex-1 gap-2 overflow-x-auto">
            {['全部', ...hotTagStats.map((item) => item.tag)].map((tagName) => (
              <button
                type="button"
                key={tagName}
                onClick={() => setActiveTag(tagName)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeTag === tagName ? 'bg-coral text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tagName}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleFeedSortChange(key)}
                aria-label={label}
                title={label}
                className={`flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  feedSort === key ? 'bg-coral text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 下拉刷新指示（移动端） ─── */}
      {(pullY > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center gap-1.5 overflow-hidden text-xs text-muted-foreground"
          style={{ height: isRefreshing ? 36 : pullY }}
        >
          <Loader2 className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? '刷新中...' : pullY >= PULL_THRESHOLD ? '松开刷新' : '下拉刷新'}
        </div>
      )}

      {/* ─── 主内容区 ─── */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="sr-only">买家说 · 好物分享首页</h1>
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="secondary" className="border-0 bg-coral-light text-coral-contrast">{posts.length} 篇分享</Badge>
          <span className="text-xs text-muted-foreground">{activeTag}</span>
        </div>
        {isInitialLoading && posts.length === 0 && (
          <div className="flex items-start gap-3">
            {Array.from({ length: columnCount }).map((_, columnIndex) => (
              <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-3">
                {Array.from({ length: 2 }).map((_, index) => (
                  <Skeleton key={index} className="rounded-xl" style={{ aspectRatio: index % 3 === 0 ? '3/4' : index % 3 === 1 ? '1/1' : '4/5' }} />
                ))}
              </div>
            ))}
          </div>
        )}
        {feedError && (
          <ErrorState message={feedError} onRetry={() => void feedQuery.refetch()} />
        )}
        {!isInitialLoading && !feedError && posts.length === 0 && (
          <div className="rounded-xl bg-card">
            {isFollowingFeed ? (
              <EmptyState
                icon={Users}
                title="关注一些感兴趣的买家吧"
                description="关注后，TA 的分享会出现在这里"
                action={(
                  <Button onClick={() => setFeedSort('new')} className="mt-2 bg-coral text-white hover:bg-coral-dark">
                    <TrendingUp className="mr-1.5 h-4 w-4" />
                    去逛逛最新分享
                  </Button>
                )}
              />
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="暂无公开分享"
                action={(
                  <Button onClick={() => navigate('/publish')} className="mt-2 bg-coral text-white hover:bg-coral-dark">
                    <Plus className="mr-1.5 h-4 w-4" />
                    去发布
                  </Button>
                )}
              />
            )}
          </div>
        )}
        <div className="flex items-start gap-3">
          {distributedColumns.map((column, columnIndex) => (
            <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-3">
              {column.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ))}
        </div>
        {hasMore && (
          <div ref={loadMoreRef} className="py-8 text-center">
            {isFetchingMore && <span className="text-sm text-muted-foreground">加载中...</span>}
          </div>
        )}
      </main>

      {/* ─── 底部 TabBar（移动端） ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t border-border bg-card/95 backdrop-blur-lg safe-bottom md:hidden">
        {TABBAR_ORDER.map((key) => CHANNELS[key]).map((tab) => {
          const isActive = activeTab === tab.key
          const Icon = tab.icon
          const isPublish = tab.key === 'publish'
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabClick(tab.key)}
              className={`relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 transition-transform active:scale-90 ${
                isPublish ? '' : isActive ? 'text-coral' : 'text-muted-foreground'
              }`}
            >
              {isPublish ? (
                <div className="flex h-10 w-10 -mt-2 items-center justify-center rounded-full bg-coral text-white shadow-lg shadow-coral/25">
                  <Icon className="h-5 w-5" />
                </div>
              ) : (
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              )}
              <span className={`text-[10px] ${isPublish ? 'text-coral font-medium' : ''}`}>{tab.label}</span>
              {isActive && !isPublish && (
                <span className="absolute bottom-1.5 h-0.5 w-5 rounded-full bg-coral" />
              )}
            </button>
          )
        })}
      </div>

      {/* ─── 登出二次确认（U34：统一 ConfirmDialog） ─── */}
      <ConfirmDialog
        open={showLogoutConfirm}
        title="退出登录？"
        description="退出后将以游客身份浏览，随时可以重新登录。"
        confirmText="退出登录"
        destructive
        isSubmitting={isLoggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  )
}
