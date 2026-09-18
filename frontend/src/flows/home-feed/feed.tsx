import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { Clock, Heart, Loader2, Plus, Search, TrendingUp, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { useToast } from '@/components/ui/toast'
import { UserMenu } from '@/components/layout/user-menu'
import { useUnreadCount } from '@/hooks/use-unread-count'
import { useTheme } from '@/hooks/use-theme'
import { useMe, useSessionCache } from '@/hooks/use-me'
import { Moon, Sun } from 'lucide-react'
import {
  addSearchHistory,
  clearSearchHistory,
  getHotTags,
  getSearchHistory,
  getSuggestions,
} from '@/services/search'

type TabKey = ChannelKey

/** 根据 post id 生成确定性的图片区比例（同时给出 CSS 类与数值比，供列高估算） */
function cardImageAspect(postId: number): { className: string; ratio: number } {
  const seed = ((postId * 2654435761) >>> 0) % 100
  if (seed < 30) return { className: 'aspect-[3/4]', ratio: 4 / 3 }      // 30% 高卡
  if (seed < 60) return { className: 'aspect-square', ratio: 1 }          // 30% 方卡
  if (seed < 85) return { className: 'aspect-[4/5]', ratio: 5 / 4 }      // 25% 中高卡
  return { className: 'aspect-[5/6]', ratio: 6 / 5 }                      // 15% 矮卡
}

/** 估算卡片相对高度（列宽归一化为 1000），用于最短列优先分配 */
function estimateCardHeight(post: ApiPostSummary): number {
  const { ratio } = cardImageAspect(post.id)
  return ratio * 1000 + 110 + (post.productName ? 24 : 0)
}

/**
 * 按「当前最短列优先」把卡片分配到 N 列。
 * 替代 CSS columns：多列布局在卡片少/高度不均时会留下大段列尾空白。
 */
function distributePosts(posts: ApiPostSummary[], columnCount: number): ApiPostSummary[][] {
  const columns: ApiPostSummary[][] = Array.from({ length: columnCount }, () => [])
  const heights = new Array<number>(columnCount).fill(0)
  for (const post of posts) {
    let target = 0
    for (let i = 1; i < columnCount; i++) {
      if (heights[i] < heights[target]) {
        target = i
      }
    }
    columns[target].push(post)
    heights[target] += estimateCardHeight(post)
  }
  return columns
}

/** 响应式列数（与既有断点一致：2 / md:3 / xl:4） */
function useColumnCount(): number {
  const calc = () => {
    if (typeof window === 'undefined') return 2
    return window.innerWidth >= 768 ? 3 : 2
  }
  const [count, setCount] = useState(calc)
  useEffect(() => {
    const onResize = () => setCount(calc())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return count
}

const PULL_THRESHOLD = 56

function postBackground(post: ApiPostSummary): string {
  const image = post.thumbnails?.[0] ?? post.images[0]
  if (image?.startsWith('http')) {
    const encoded = encodeURI(image).replace(/[()]/g, encodeURIComponent)
    return `url("${encoded}") center / cover`
  }
  return image || 'linear-gradient(135deg,#fecdd3,#fda4af)'
}

function PostCard({ post }: { post: ApiPostSummary }) {
  const navigate = useNavigate()
  const [imageFailed, setImageFailed] = useState(false)
  const image = post.thumbnails?.[0] ?? post.images[0]
  const hasImage = Boolean(image?.startsWith('http')) && !imageFailed
  return (
    <button
      type="button"
      onClick={() => navigate(`/posts/${post.id}`, { state: { modal: true } })}
      className="group w-full overflow-hidden rounded-xl border border-border/60 bg-card text-left transition-all hover:-translate-y-0.5 hover:border-coral/20 hover:shadow-lg"
    >
      <div className={`bg-muted ${cardImageAspect(post.id).className}`}>
        {hasImage ? (
          <img
            src={image}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="h-full w-full" style={{ background: postBackground(post) }} />
        )}
      </div>
      <div className="p-3">
        <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-relaxed text-foreground">{post.title}</h3>
        {post.productName && (
          <p className="mb-2 truncate text-xs text-coral">¥{post.productPrice ?? '—'} · {post.productSource ?? post.productName}</p>
        )}
        <div className="flex items-center justify-between">
          <div
            role="link"
            tabIndex={0}
            aria-label={`${post.userNickname} 的主页`}
            className="flex cursor-pointer items-center gap-1.5 hover:opacity-80"
            onClick={(event) => { event.stopPropagation(); navigate(`/user/${post.userId}`) }}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); navigate(`/user/${post.userId}`) } }}
          >
            <Avatar className="h-5 w-5"><AvatarFallback className="bg-coral-light text-[8px] font-bold text-coral-contrast">{post.userNickname[0]}</AvatarFallback></Avatar>
            <span className="max-w-20 truncate text-xs text-muted-foreground">{post.userNickname}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Heart className={`h-3.5 w-3.5 ${post.isLiked ? 'fill-coral text-coral' : ''}`} />
            <span className="text-xs">{post.likeCount}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

/** 搜索面板（真实数据：热门标签 / 联想 / 本地历史） */
function SearchPanel({ query, onClose }: { query: string; onClose: () => void }) {
  const navigate = useNavigate()
  const [hotTags, setHotTags] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>(() => getSearchHistory())

  // Escape 键关闭搜索面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // 热门搜索标签
  useEffect(() => {
    getHotTags()
      .then(setHotTags)
      .catch(() => { /* 加载失败时保持隐藏 */ })
  }, [])

  // 输入联想（防抖 300ms）
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSuggestions([])
      return
    }
    const timer = window.setTimeout(() => {
      getSuggestions(trimmed)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const handleSearch = (keyword: string) => {
    const trimmed = keyword.trim()
    if (!trimmed) return
    addSearchHistory(trimmed)
    onClose()
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-border/60 bg-card p-4 shadow-lg">
      {/* 输入联想 */}
      {query.trim() ? (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            联想词
          </div>
          {suggestions.length > 0 ? (
            <div className="flex flex-col">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSearch(tag)}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-foreground/80 transition-colors hover:bg-muted/60"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  {tag}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleSearch(query)}
                className="mt-1 rounded-lg px-2 py-2 text-left text-sm text-coral-contrast transition-colors hover:bg-coral-light/50"
              >
                搜索「{query.trim()}」
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleSearch(query)}
              className="w-full rounded-lg px-2 py-2 text-left text-sm text-coral-contrast transition-colors hover:bg-coral-light/50"
            >
              搜索「{query.trim()}」
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 搜索历史 */}
          {history.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  搜索历史
                </span>
                <button
                  type="button"
                  onClick={() => { clearSearchHistory(); setHistory([]) }}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  清空
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSearch(tag)}
                    className="rounded-full bg-muted px-3 py-1 text-xs text-foreground/80 transition-colors hover:bg-muted/80"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 热门搜索 */}
          {hotTags.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                热门搜索
              </div>
              <div className="flex flex-wrap gap-2">
                {hotTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSearch(tag)}
                    className="rounded-full bg-coral-light px-3 py-1 text-xs text-coral-contrast transition-colors hover:bg-coral-light/80"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          {history.length === 0 && hotTags.length === 0 && (
            <p className="text-xs text-muted-foreground">输入关键词开始搜索</p>
          )}
        </>
      )}
    </div>
  )
}

export default function HomeFeedScreen() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { theme, toggleTheme } = useTheme()
  const queryClient = useQueryClient()
  const [activeTag, setActiveTag] = useState('全部')
  const [feedSort, setFeedSort] = useState<'new' | 'hot'>('new')
  const feedTag = activeTag === '全部' ? undefined : activeTag
  const feedQueryKey = ['feed', feedTag, feedSort] as const
  // Feed 游标分页（P4.1）：按 标签+排序 独立缓存，返回列表秒开；切换时保留旧数据避免闪烁；
  // 旧请求由 AbortSignal 自动取消（替代原 requestVersion 手动版本守卫）
  const feedQuery = useInfiniteQuery({
    queryKey: feedQueryKey,
    queryFn: ({ pageParam, signal }) => getFeed(pageParam, feedTag, feedSort, signal),
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
    setIsLoggingOut(false)
    setShowLogoutConfirm(false)
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
          <button
            type="button"
            onClick={() => setFeedSort(feedSort === 'new' ? 'hot' : 'new')}
            aria-label={feedSort === 'hot' ? '切换到最新' : '切换到热门'}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              feedSort === 'hot' ? 'bg-coral text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title={feedSort === 'hot' ? '切换到最新' : '切换到热门'}
          >
            {feedSort === 'hot' ? <TrendingUp className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            <span className="hidden sm:inline">{feedSort === 'hot' ? '热门' : '最新'}</span>
          </button>
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
