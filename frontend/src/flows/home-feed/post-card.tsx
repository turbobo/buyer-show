import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { ApiPostSummary } from '@/services/posts'
import { cardImageClass } from './waterfall'

function postBackground(post: ApiPostSummary): string {
  const image = post.thumbnails?.[0] ?? post.images[0]
  if (image?.startsWith('http')) {
    const encoded = encodeURI(image).replace(/[()]/g, encodeURIComponent)
    return `url("${encoded}") center / cover`
  }
  return image || 'linear-gradient(135deg,#fecdd3,#fda4af)'
}

/* ─── 瀑布流卡片（点击打开详情浮层；昵称跳用户主页） ─── */
export function PostCard({ post }: { post: ApiPostSummary }) {
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
      <div className={`bg-muted ${cardImageClass(post.id)}`}>
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
