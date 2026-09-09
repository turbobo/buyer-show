import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Heart, Home, MessageCircle, Plus, Search, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getFeed, type ApiPostSummary } from '@/services/posts'
import { getTokenRole } from '@/services/http'
import { mockTags } from '../shared/mock-data'

function postBackground(post: ApiPostSummary): string {
  const image = post.images[0]
  return image?.startsWith('http') ? `url(${image}) center / cover` : image || 'linear-gradient(135deg,#fecdd3,#fda4af)'
}

function PostCard({ post }: { post: ApiPostSummary }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(`/posts/${post.id}`)}
      className="group w-full overflow-hidden rounded-xl border border-border/60 bg-white text-left transition-all hover:-translate-y-0.5 hover:border-coral/20 hover:shadow-lg"
    >
      <div className="aspect-[3/4] bg-muted" style={{ background: postBackground(post) }} />
      <div className="p-3">
        <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-relaxed text-foreground">{post.title}</h3>
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

export default function HomeFeedScreen() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<ApiPostSummary[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [activeTag, setActiveTag] = useState('全部')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestVersion = useRef(0)

  const loadFeed = useCallback(async (nextCursor?: string, append = false) => {
    const version = ++requestVersion.current
    const tag = activeTag === '全部' ? undefined : activeTag.replace(/^[^\u4e00-\u9fa5]+/, '')
    setIsLoading(true)
    setError(null)
    try {
      const page = await getFeed(nextCursor, tag)
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
  }, [activeTag])

  useEffect(() => { void loadFeed() }, [loadFeed])

  return (
    <div className="min-h-screen bg-warm-bg pb-20">
      <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral text-sm font-bold text-white">¥</div><span className="hidden text-lg font-bold sm:block">买家说</span></div>
          <div className="relative mx-auto max-w-xl flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="搜索好物、品牌、标签..." className="h-10 rounded-full border-0 bg-muted/50 pl-10" /></div>
          <Button aria-label="消息" variant="ghost" size="icon" onClick={() => navigate('/messages')}><Bell className="h-5 w-5" /></Button>
          {getTokenRole() === 'ADMIN' && <Button className="hidden sm:inline-flex" variant="ghost" size="sm" onClick={() => navigate('/admin/moderation')}>审核台</Button>}
          <Button className="hidden sm:inline-flex" variant="ghost" size="sm" onClick={() => navigate('/login')}>登录</Button>
          <Button aria-label="发布分享" onClick={() => navigate('/publish')} className="h-9 rounded-full bg-coral px-3 text-white hover:bg-coral-dark sm:px-4"><Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">发布</span></Button>
        </div>
      </nav>

      <div className="sticky top-16 z-40 border-b border-border bg-white/80 px-4 py-3 backdrop-blur-sm"><div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">{mockTags.map((tag) => <button type="button" key={tag.name} onClick={() => setActiveTag(tag.name)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${activeTag === tag.name ? 'bg-coral text-white' : 'bg-muted text-muted-foreground'}`}>{tag.name}</button>)}</div></div>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex items-center gap-2"><Badge variant="secondary" className="border-0 bg-coral-light text-coral">{posts.length} 篇分享</Badge><span className="text-xs text-muted-foreground">{activeTag}</span></div>
        {isLoading && posts.length === 0 && <div className="columns-2 gap-3 space-y-3 md:columns-3 xl:columns-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="aspect-[3/4] break-inside-avoid rounded-xl" />)}</div>}
        {error && <div className="rounded-xl border border-destructive/30 bg-white p-6 text-center"><p className="mb-3 text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => void loadFeed()}>重新加载</Button></div>}
        {!isLoading && !error && posts.length === 0 && <div className="rounded-xl bg-white p-12 text-center text-sm text-muted-foreground">暂无公开分享</div>}
        <div className="columns-2 gap-3 space-y-3 md:columns-3 xl:columns-4">{posts.map((post) => <div key={post.id} className="break-inside-avoid"><PostCard post={post} /></div>)}</div>
        {hasMore && <div className="py-8 text-center"><Button variant="outline" disabled={isLoading} onClick={() => cursor && void loadFeed(cursor, true)}>{isLoading ? '加载中...' : '加载更多'}</Button></div>}
      </main>

      <div className="fixed bottom-0 left-0 right-0 flex h-16 items-center border-t border-border bg-white md:hidden"><button type="button" className="flex flex-1 flex-col items-center text-coral"><Home className="h-5 w-5" /><span className="text-[10px]">首页</span></button><button type="button" className="flex flex-1 flex-col items-center text-muted-foreground"><Search className="h-5 w-5" /><span className="text-[10px]">搜索</span></button><button type="button" onClick={() => navigate('/publish')} className="flex flex-1 flex-col items-center text-coral"><Plus className="h-6 w-6" /><span className="text-[10px]">发布</span></button><button type="button" onClick={() => navigate('/messages')} className="flex flex-1 flex-col items-center text-muted-foreground"><MessageCircle className="h-5 w-5" /><span className="text-[10px]">消息</span></button><button type="button" className="flex flex-1 flex-col items-center text-muted-foreground"><User className="h-5 w-5" /><span className="text-[10px]">我的</span></button></div>
    </div>
  )
}
