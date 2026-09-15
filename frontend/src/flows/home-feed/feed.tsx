import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock, Heart, Home, LogOut, MessageCircle, Plus, Search, TrendingUp, User as UserIcon, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getFeed, type ApiPostSummary } from '@/services/posts'
import { clearTokens, getTokenRole } from '@/services/http'
import { getCurrentUserProfile, type UserProfile } from '@/services/auth'
import { useToast } from '@/components/ui/toast'
import { useTheme } from '@/hooks/use-theme'
import { Moon, Sun } from 'lucide-react'
import { mockTags, hotSearchTags, searchHistory } from '../shared/mock-data'

type TabKey = 'home' | 'search' | 'publish' | 'messages' | 'profile'

/** 根据 post id 生成确定性的随机图片高度（180~260px 范围） */
function cardImageHeight(postId: number): string {
  const seed = ((postId * 2654435761) >>> 0) % 100
  if (seed < 30) return 'aspect-[3/4]'      // 30% 高卡
  if (seed < 60) return 'aspect-square'      // 30% 方卡
  if (seed < 85) return 'aspect-[4/5]'       // 25% 中高卡
  return 'aspect-[5/6]'                      // 15% 矮卡
}

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
  return (
    <button
      type="button"
      onClick={() => navigate(`/posts/${post.id}`)}
      className="group w-full overflow-hidden rounded-xl border border-border/60 bg-card text-left transition-all hover:-translate-y-0.5 hover:border-coral/20 hover:shadow-lg"
    >
      <div className={`bg-muted ${cardImageHeight(post.id)}`} style={{ background: postBackground(post) }} />
      <div className="p-3">
        <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-relaxed text-foreground">{post.title}</h3>
        {post.productName && (
          <p className="mb-2 truncate text-xs text-coral">¥{post.productPrice ?? '—'} · {post.productSource ?? post.productName}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
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
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [activeTag, setActiveTag] = useState('全部')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [feedSort, setFeedSort] = useState<'new' | 'hot'>('new')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const requestVersion = useRef(0)

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

  const handleLogout = () => {
    clearTokens()
    setCurrentUser(null)
  }

  const handleTabClick = (tab: TabKey) => {
    setActiveTab(tab)
    if (tab === 'publish') navigate('/publish')
    else if (tab === 'messages') navigate('/messages')
    else if (tab === 'search') {
      setIsSearchFocused(true)
      // 滚动到搜索框
      document.getElementById('search-input')?.focus()
    }
  }

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
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="hidden text-lg font-bold sm:block">买家说</span>
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
          {currentUser ? (
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-8 w-8">
                  {currentUser.avatarUrl && <AvatarImage src={currentUser.avatarUrl} alt={currentUser.nickname} />}
                  <AvatarFallback className="bg-coral-light text-xs font-bold text-coral">
                    {currentUser.nickname[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-20 truncate text-sm font-medium">{currentUser.nickname}</span>
              </button>
              <Button aria-label="退出登录" variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button className="hidden sm:inline-flex" variant="ghost" size="sm" onClick={() => navigate('/login')}>
              登录
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
        </div>
      </nav>

      {/* ─── 标签筛选栏 ─── */}
      <div className="sticky top-16 z-40 border-b border-border bg-card/80 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4">
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

      {/* ─── 主内容区 ─── */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="secondary" className="border-0 bg-coral-light text-coral">{posts.length} 篇分享</Badge>
          <span className="text-xs text-muted-foreground">{activeTag}</span>
        </div>
        {isLoading && posts.length === 0 && (
          <div className="columns-2 gap-3 space-y-3 md:columns-3 xl:columns-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="break-inside-avoid rounded-xl" style={{ aspectRatio: index % 3 === 0 ? '3/4' : index % 3 === 1 ? '1/1' : '4/5' }} />
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
        <div className="columns-2 gap-3 space-y-3 md:columns-3 xl:columns-4">
          {posts.map((post) => (
            <div key={post.id} className="break-inside-avoid">
              <PostCard post={post} />
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
    </div>
  )
}
