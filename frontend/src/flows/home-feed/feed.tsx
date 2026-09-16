import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clock, Heart, Home, Loader2, MessageCircle, Plus, Search, TrendingUp, User as UserIcon, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getFeed, type ApiPostSummary } from '@/services/posts'
import { clearTokens, getTokenRole } from '@/services/http'
import { getCurrentUserProfile, type UserProfile } from '@/services/auth'
import { useToast } from '@/components/ui/toast'
import { UserMenu } from '@/components/layout/user-menu'
import { useUnreadCount } from '@/hooks/use-unread-count'
import { useTheme } from '@/hooks/use-theme'
import { Moon, Sun } from 'lucide-react'
import { mockTags, hotSearchTags, searchHistory } from '../shared/mock-data'

type TabKey = 'home' | 'search' | 'publish' | 'messages' | 'profile'

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
      onClick={() => navigate(`/posts/${post.id}`)}
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
            <Avatar className="h-5 w-5"><AvatarFallback className="bg-coral-light text-[8px] font-bold text-coral">{post.userNickname[0]}</AvatarFallback></Avatar>
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

/** 搜索面板 */
function SearchPanel({ query, onClose }: { query: string; onClose: () => void }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { theme, toggleTheme } = useTheme()

  // Escape 键关闭搜索面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const filteredHot = query
    ? hotSearchTags.filter((tag) => tag.includes(query))
    : hotSearchTags

  const handleSearch = (keyword: string) => {
    toast('info', `搜索「${keyword}」功能开发中`)
    onClose()
  }

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-border/60 bg-card p-4 shadow-lg">
      {/* 搜索历史 */}
      {!query && searchHistory.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            搜索历史
          </div>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((tag) => (
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
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          {query ? '匹配结果' : '热门搜索'}
        </div>
        {filteredHot.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {filteredHot.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleSearch(tag)}
                className="rounded-full bg-coral-light px-3 py-1 text-xs text-coral transition-colors hover:bg-coral-light/80"
              >
                {tag}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">无匹配结果</p>
        )}
      </div>
    </div>
  )
}

export default function HomeFeedScreen() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { theme, toggleTheme } = useTheme()
  const [posts, setPosts] = useState<ApiPostSummary[]>([])
  const columnCount = useColumnCount()
  const distributedColumns = useMemo(() => distributePosts(posts, columnCount), [posts, columnCount])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [activeTag, setActiveTag] = useState('全部')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const unreadCount = useUnreadCount()
  const [searchQuery, setSearchQuery] = useState('')
  const [feedSort, setFeedSort] = useState<'new' | 'hot'>('new')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const requestVersion = useRef(0)
  const [pullY, setPullY] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const pullYRef = useRef(0)

  const loadFeed = useCallback(async (nextCursor?: string, append = false) => {
    const version = ++requestVersion.current
    const tag = activeTag === '全部' ? undefined : activeTag.replace(/^[^\u4e00-\u9fa5]+/, '')
    setIsLoading(true)
    setError(null)
    try {
      const page = await getFeed(nextCursor, tag, feedSort)
      if (version !== requestVersion.current) return
      setPosts((current) => append ? [...current, ...page.list] : page.list)
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (requestError) {
      if (version !== requestVersion.current) return
      setError(requestError instanceof Error ? requestError.message : '加载失败，请稍后重试')
    } finally {
      if (version === requestVersion.current) setIsLoading(false)
    }
  }, [activeTag, feedSort])

  useEffect(() => { void loadFeed() }, [loadFeed])

  const refreshFeed = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    await loadFeed()
    setIsRefreshing(false)
  }, [isRefreshing, loadFeed])

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

  // 触底自动加载更多
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading && cursor) {
          void loadFeed(cursor, true)
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isLoading, cursor, loadFeed])

  useEffect(() => {
    getCurrentUserProfile()
      .then(setCurrentUser)
      .catch(() => { /* 未登录或请求失败，保持 null */ })
  }, [])

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
    setCurrentUser(null)
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
    if (tab === 'publish') navigate('/publish')
    else if (tab === 'messages') navigate('/messages')
    else if (tab === 'profile') navigate('/profile')
    else if (tab === 'home') window.scrollTo({ top: 0, behavior: 'smooth' })
    else if (tab === 'search') {
      setIsSearchFocused(true)
      // 滚动到搜索框
      document.getElementById('search-input')?.focus()
    }
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
      toast('info', `搜索「${searchQuery.trim()}」功能开发中`)
      setIsSearchFocused(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ─── 顶部导航栏 ─── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <button type="button" onClick={() => handleTabClick('home')} className="flex items-center gap-2" aria-label="返回首页">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="hidden text-lg font-bold sm:block">买家说</span>
          </button>
          <div className="hidden items-center gap-1 md:flex">
            <Button variant="secondary" size="sm" onClick={() => handleTabClick('home')}>
              <Home className="mr-1 h-4 w-4" />
              首页
            </Button>
            <Button variant="ghost" size="sm" className="relative" onClick={() => navigate('/messages')}>
              <MessageCircle className="mr-1 h-4 w-4" />
              消息
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
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
          <Button aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'} variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          {currentUser && getTokenRole() === 'ADMIN' && (
            <Button className="hidden sm:inline-flex" variant="ghost" size="sm" onClick={() => navigate('/admin/moderation')}>
              审核台
            </Button>
          )}
          <Button
            aria-label="发布分享"
            onClick={() => navigate('/publish')}
            className="h-9 rounded-full bg-coral px-3 text-white hover:bg-coral-dark sm:px-4"
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
      </nav>

      {/* ─── 标签筛选栏 ─── */}
      <div className="sticky top-14 z-40 border-b border-border bg-card/80 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4">
          <div className="flex flex-1 gap-2 overflow-x-auto">
            {mockTags.map((tag) => (
              <button
                type="button"
                key={tag.display}
                onClick={() => setActiveTag(tag.display)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTag === tag.display ? 'bg-coral text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tag.display}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setFeedSort(feedSort === 'new' ? 'hot' : 'new')}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
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
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="secondary" className="border-0 bg-coral-light text-coral">{posts.length} 篇分享</Badge>
          <span className="text-xs text-muted-foreground">{activeTag}</span>
        </div>
        {isLoading && posts.length === 0 && (
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
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-card p-6 text-center">
            <p className="mb-3 text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => void loadFeed()}>重新加载</Button>
          </div>
        )}
        {!isLoading && !error && posts.length === 0 && (
          <div className="rounded-xl bg-card p-12 text-center">
            <p className="mb-4 text-sm text-muted-foreground">暂无公开分享</p>
            <Button onClick={() => navigate('/publish')} className="bg-coral text-white hover:bg-coral-dark">
              <Plus className="mr-1.5 h-4 w-4" />
              去发布
            </Button>
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
            {isLoading && <span className="text-sm text-muted-foreground">加载中...</span>}
          </div>
        )}
      </main>

      {/* ─── 底部 TabBar（移动端） ─── */}
      <div className="fixed bottom-0 left-0 right-0 flex h-16 items-center border-t border-border bg-card/95 backdrop-blur-lg safe-bottom md:hidden">
        {([
          { key: 'home' as const, icon: Home, label: '首页' },
          { key: 'search' as const, icon: Search, label: '搜索' },
          { key: 'publish' as const, icon: Plus, label: '发布' },
          { key: 'messages' as const, icon: MessageCircle, label: '消息' },
          { key: 'profile' as const, icon: UserIcon, label: '我的' },
        ]).map((tab) => {
          const isActive = activeTab === tab.key
          const Icon = tab.icon
          const isPublish = tab.key === 'publish'
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabClick(tab.key)}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-transform active:scale-90 ${
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

      {/* ─── 登出二次确认 ─── */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="退出登录确认"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">退出登录？</h3>
            <p className="mt-2 text-sm text-muted-foreground">退出后将以游客身份浏览，随时可以重新登录。</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" autoFocus disabled={isLoggingOut} onClick={() => setShowLogoutConfirm(false)}>
                取消
              </Button>
              <Button variant="destructive" disabled={isLoggingOut} onClick={handleConfirmLogout}>
                {isLoggingOut ? '退出中...' : '退出登录'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
