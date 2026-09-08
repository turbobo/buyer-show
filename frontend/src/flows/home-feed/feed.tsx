// FLOW: Home Feed Browse
// SCREEN 1 of 3: Home Feed | PLATFORM: Web (responsive) | ENTRY: / | EXIT: Post Detail
import { useState } from 'react'
import { Search, Bell, Plus, Home, MessageCircle, User, Heart, MapPin, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { mockPosts, mockTags, mockCurrentUser } from '../shared/mock-data'
import type { Post } from '../shared/types'

// ─── Top Navigation Bar ───
function TopNav({ onPublishClick, onMessagesClick }: { onPublishClick: () => void; onMessagesClick: () => void }) {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-coral rounded-lg flex items-center justify-center text-white font-bold text-sm">¥</div>
          <span className="text-lg font-bold text-foreground hidden sm:block">买家说</span>
        </div>
        <div className="flex-1 max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="搜索好物、品牌、标签..." className="pl-10 h-10 bg-muted/50 border-0 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="relative" onClick={onMessagesClick}>
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-coral text-white text-[10px] rounded-full flex items-center justify-center font-bold">3</span>
          </Button>
          <Button onClick={onPublishClick} className="bg-coral hover:bg-coral-dark text-white rounded-full px-4 h-9 gap-1.5 text-sm font-semibold">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">发布</span>
          </Button>
          <Avatar className="w-8 h-8 border-2 border-coral/20">
            <AvatarFallback className="bg-coral-light text-coral text-xs font-bold">{mockCurrentUser.nickname[0]}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </nav>
  )
}

// ─── Tag Filter Bar ───
function TagFilter({ tags, activeTag, onTagChange }: { tags: typeof mockTags; activeTag: string; onTagChange: (t: string) => void }) {
  return (
    <div className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 py-3">
            {tags.map(tag => (
              <button
                key={tag.name}
                onClick={() => onTagChange(tag.name)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeTag === tag.name
                    ? 'bg-coral text-white shadow-sm'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

// ─── Post Card ───
function PostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border border-border/60 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-coral/5 hover:border-coral/20 hover:-translate-y-0.5"
    >
      <div className="aspect-[3/4] relative overflow-hidden" style={{ background: post.images[0] }}>
        <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-60">
          {post.tags[0]?.includes('美妆') ? '🧴' : post.tags[0]?.includes('数码') ? '📱' : post.tags[0]?.includes('运动') ? '👟' : post.tags[0]?.includes('食品') ? '🥑' : post.tags[0]?.includes('服饰') ? '💄' : '🎧'}
        </div>
        {post.productPrice && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-semibold backdrop-blur-sm">
            ¥{post.productPrice}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed mb-2">{post.title}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Avatar className="w-5 h-5">
              <AvatarFallback className="bg-coral-light text-coral text-[8px] font-bold">{post.user.nickname[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-16">{post.user.nickname}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Heart className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-coral text-coral' : ''}`} />
            <span className="text-xs">{post.likeCount > 999 ? `${(post.likeCount / 1000).toFixed(1)}k` : post.likeCount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar (Desktop only) ───
function Sidebar() {
  return (
    <aside className="hidden xl:block w-64 shrink-0">
      <div className="sticky top-32 space-y-4">
        <div className="bg-white rounded-xl border border-border/60 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-coral" /> 热门话题
          </h4>
          <div className="space-y-2">
            {['# 年度好物', '# 平价替代', '# 学生党必看', '# 618必囤', '# 新手护肤'].map(tag => (
              <button key={tag} className="block text-sm text-muted-foreground hover:text-coral transition-colors">{tag}</button>
            ))}
          </div>
        </div>
        <div className="bg-coral-light/50 rounded-xl p-4">
          <p className="text-xs text-coral font-medium mb-1">🎉 加入买家说</p>
          <p className="text-xs text-muted-foreground mb-3">分享你的真实购物体验</p>
          <Button className="w-full bg-coral hover:bg-coral-dark text-white text-xs h-8">立即注册</Button>
        </div>
      </div>
    </aside>
  )
}

// ─── Mobile Bottom TabBar ───
function MobileTabBar({ activeTab }: { activeTab: string }) {
  const tabs = [
    { key: 'home', icon: Home, label: '首页' },
    { key: 'search', icon: Search, label: '搜索' },
    { key: 'publish', icon: Plus, label: '发布' },
    { key: 'messages', icon: MessageCircle, label: '消息' },
    { key: 'profile', icon: User, label: '我的' },
  ]
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-border">
      <div className="flex items-center h-16 pb-safe">
        {tabs.map(tab => (
          <button key={tab.key} className={`flex-1 flex flex-col items-center gap-0.5 ${activeTab === tab.key ? 'text-coral' : 'text-muted-foreground'}`}>
            {tab.key === 'publish' ? (
              <div className="w-10 h-10 bg-coral rounded-xl flex items-center justify-center shadow-lg shadow-coral/30 -mt-3">
                <tab.icon className="w-5 h-5 text-white" />
              </div>
            ) : (
              <>
                <tab.icon className="w-5 h-5" />
                <span className="text-[10px]">{tab.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════
// MAIN EXPORT: Home Feed Screen
// ═══════════════════════════════════
export default function HomeFeedScreen({ onPostClick, onPublishClick, onMessagesClick }: {
  onPostClick: (postId: string) => void
  onPublishClick: () => void
  onMessagesClick: () => void
}) {
  const [activeTag, setActiveTag] = useState('全部')
  const [loading] = useState(false)

  const filteredPosts = activeTag === '全部'
    ? mockPosts
    : mockPosts.filter(p => p.tags.some(t => activeTag.includes(t) || t.includes(activeTag.replace(/[^\u4e00-\u9fa5]/g, ''))))
  const displayPosts = filteredPosts.length > 0 ? filteredPosts : mockPosts

  // Split into columns for waterfall layout
  const col1 = displayPosts.filter((_, i) => i % 2 === 0)
  const col2 = displayPosts.filter((_, i) => i % 2 === 1)

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* Desktop Nav */}
      <div className="hidden md:block">
        <TopNav onPublishClick={onPublishClick} onMessagesClick={onMessagesClick} />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-coral rounded-lg flex items-center justify-center text-white font-bold text-xs">¥</div>
            <span className="font-bold text-foreground">买家说</span>
          </div>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="搜索好物..." className="pl-9 h-9 bg-muted/50 border-0 rounded-full text-sm" />
            </div>
          </div>
        </div>
      </div>

      <TagFilter tags={mockTags} activeTag={activeTag} onTagChange={setActiveTag} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <Sidebar />

          <main className="flex-1 min-w-0">
            {/* Feed Stats */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-coral-light text-coral border-0 text-xs">{displayPosts.length} 篇分享</Badge>
                <span className="text-xs text-muted-foreground hidden sm:block">{activeTag}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>最新</span>
              </div>
            </div>

            {loading ? (
              <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="break-inside-avoid bg-white rounded-xl border border-border/60 overflow-hidden">
                    <Skeleton className="aspect-[3/4]" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-10 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Desktop: CSS columns waterfall */}
                <div className="hidden md:block columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3">
                  {displayPosts.map(post => (
                    <div key={post.id} className="break-inside-avoid">
                      <PostCard post={post} onClick={() => onPostClick(post.id)} />
                    </div>
                  ))}
                </div>

                {/* Mobile: 2-col flex waterfall */}
                <div className="md:hidden flex gap-2">
                  <div className="flex-1 flex flex-col gap-2">
                    {col1.map(post => (
                      <PostCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />
                    ))}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    {col2.map(post => (
                      <PostCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* End indicator */}
            <div className="text-center py-8 text-sm text-muted-foreground">
              — 已经到底啦 —
            </div>
          </main>
        </div>
      </div>

      <MobileTabBar activeTab="home" />
    </div>
  )
}
