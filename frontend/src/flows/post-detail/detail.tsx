// FLOW: Post Detail & Interaction
// SCREEN 1 of 2: Post Detail | PLATFORM: Web (responsive) | ENTRY: /post/:id | EXIT: back to Feed
import { useState } from 'react'
import { ArrowLeft, Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Star, ExternalLink, ChevronLeft, ChevronRight, Send, Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { mockPosts, mockComments, mockCurrentUser } from '../shared/mock-data'
import type { Post, Comment } from '../shared/types'

// ─── Image Carousel ───
function ImageCarousel({ images, emoji }: { images: string[]; emoji: string }) {
  const [current, setCurrent] = useState(0)
  return (
    <div className="relative aspect-square bg-muted rounded-xl overflow-hidden group">
      <div className="absolute inset-0 flex items-center justify-center text-7xl" style={{ background: images[0] }}>
        {emoji}
      </div>
      {images.length > 1 && (
        <>
          <button onClick={() => setCurrent(Math.max(0, current - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrent(Math.min(images.length - 1, current + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Product Info Card ───
function ProductInfoCard({ post }: { post: Post }) {
  if (!post.productName) return null
  return (
    <div className="bg-warm-bg border border-border/60 rounded-xl p-4 flex items-start gap-3">
      <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-2xl" style={{ background: post.images[0] }}>
        {post.tags[0]?.includes('美妆') ? '🧴' : post.tags[0]?.includes('数码') ? '📱' : '👟'}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground truncate">{post.productName}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="bg-green-50 text-green-700 border-0 text-xs gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> {post.productSource}
          </Badge>
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < (post.productRating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-bold text-coral">¥{post.productPrice}</span>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1 text-coral border-coral/30 hover:bg-coral-light">
            去购买 <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Comment Item ───
function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-3">
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
        <AvatarFallback className="bg-coral-light text-coral text-xs font-bold">{comment.user.nickname[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{comment.user.nickname}</span>
          <span className="text-xs text-muted-foreground">{comment.createdAt}</span>
        </div>
        <p className="text-sm text-foreground/80 mt-0.5 leading-relaxed">{comment.content}</p>
        <div className="flex items-center gap-4 mt-1.5">
          <button className="text-xs text-muted-foreground hover:text-coral flex items-center gap-1">
            <Heart className={`w-3 h-3 ${comment.isLiked ? 'fill-coral text-coral' : ''}`} /> {comment.likeCount}
          </button>
          <button className="text-xs text-muted-foreground hover:text-coral">回复</button>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 pl-4 border-l-2 border-border/60 space-y-3">
            {comment.replies.map(reply => <CommentItem key={reply.id} comment={reply} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Author Sidebar (Desktop) ───
function AuthorSidebar({ post }: { post: Post }) {
  return (
    <aside className="hidden lg:block w-72 shrink-0">
      <div className="sticky top-20 space-y-4">
        <div className="bg-white rounded-xl border border-border/60 p-5 text-center">
          <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-coral/20">
            <AvatarFallback className="bg-coral-light text-coral text-xl font-bold">{post.user.nickname[0]}</AvatarFallback>
          </Avatar>
          <h4 className="font-semibold text-foreground">{post.user.nickname}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.user.bio}</p>
          <div className="flex justify-center gap-6 mt-3 text-center">
            <div><span className="block text-sm font-bold text-foreground">{post.user.postCount}</span><span className="text-xs text-muted-foreground">分享</span></div>
            <div><span className="block text-sm font-bold text-foreground">{(post.user.followerCount / 1000).toFixed(1)}k</span><span className="text-xs text-muted-foreground">粉丝</span></div>
          </div>
          <Button className="w-full mt-4 bg-coral hover:bg-coral-dark text-white rounded-full">+ 关注</Button>
        </div>
        <div className="bg-white rounded-xl border border-border/60 p-4">
          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">TA 的更多分享</h5>
          <div className="grid grid-cols-3 gap-1.5">
            {mockPosts.filter(p => p.userId === post.userId).slice(0, 6).map(p => (
              <div key={p.id} className="aspect-square rounded-lg" style={{ background: p.images[0] }} />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

// ═══════════════════════════════════
// MAIN EXPORT: Post Detail Screen
// ═══════════════════════════════════
export default function PostDetailScreen({ postId, onBack }: { postId: string; onBack: () => void }) {
  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [commentText, setCommentText] = useState('')
  const post = mockPosts.find(p => p.id === postId) || mockPosts[0]
  const emoji = post.tags[0]?.includes('美妆') ? '🧴' : post.tags[0]?.includes('数码') ? '📱' : post.tags[0]?.includes('运动') ? '👟' : post.tags[0]?.includes('食品') ? '🥑' : '🎧'

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Avatar className="w-7 h-7"><AvatarFallback className="bg-coral-light text-coral text-[10px] font-bold">{post.user.nickname[0]}</AvatarFallback></Avatar>
            <span className="text-sm font-medium text-foreground truncate">{post.user.nickname}</span>
            <span className="text-xs text-muted-foreground">· {post.createdAt}</span>
          </div>
          <Button variant="ghost" size="icon"><MoreHorizontal className="w-5 h-5" /></Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Image Section */}
                <div className="md:w-1/2 p-4 md:p-6">
                  <ImageCarousel images={post.images} emoji={emoji} />
                </div>

                {/* Content Section */}
                <div className="md:w-1/2 p-4 md:p-6 md:pl-0">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight mb-4">{post.title}</h1>
                  <p className="text-sm text-foreground/70 leading-relaxed mb-4">{post.content}</p>

                  <ProductInfoCard post={post} />

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs text-coral hover:underline cursor-pointer">#{tag}</span>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>❤️ {post.likeCount} 赞</span>
                    <span>💬 {post.commentCount} 评论</span>
                    <span>⭐ {post.favoriteCount} 收藏</span>
                  </div>

                  <Separator className="my-4" />

                  {/* Comments Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-foreground">评论 {post.commentCount}</h3>
                      <span className="text-xs text-muted-foreground cursor-pointer hover:text-coral">最新 ▾</span>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {mockComments.map(comment => (
                        <CommentItem key={comment.id} comment={comment} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>

          <AuthorSidebar post={post} />
        </div>
      </div>

      {/* Bottom Interaction Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="flex-1 relative hidden md:block">
            <Input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="说点什么..."
              className="pr-10 h-10 bg-muted/50 border-0 rounded-full"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2"><Smile className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setLiked(!liked)}>
            <Heart className={`w-5 h-5 ${liked ? 'fill-coral text-coral' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon">
            <MessageCircle className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setFavorited(!favorited)}>
            <Bookmark className={`w-5 h-5 ${favorited ? 'fill-coral text-coral' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon">
            <Share2 className="w-5 h-5" />
          </Button>
          <Button size="sm" className="md:hidden bg-coral hover:bg-coral-dark text-white rounded-full gap-1.5 h-9 px-4">
            <Send className="w-3.5 h-3.5" /> 评论
          </Button>
        </div>
      </div>
    </div>
  )
}
