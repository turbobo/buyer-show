import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { ApiPost } from '@/services/posts'

/** JSON-LD 结构化数据（SEO）：详情页 <script type="application/ld+json"> 内容。 */
export function buildPostJsonLd(post: ApiPost) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: post.title,
    articleBody: post.content.substring(0, 200),
    author: {
      '@type': 'Person',
      name: post.userNickname,
    },
    datePublished: post.createdAt,
    interactionStatistic: [
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: post.likeCount },
      { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: post.commentCount },
    ],
    ...(post.images.length > 0 ? { image: post.images } : {}),
  }
}

/* ─── 帖子内容子组件（标题/正文/商品卡/标签/统计） ─── */
export function PostContent({ post }: { post: ApiPost }) {
  const { toast } = useToast()

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast('success', successMessage)
    } catch {
      toast('error', '复制失败，请手动复制')
    }
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{post.title}</h1>
      <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{post.content}</p>
      {post.productName && (
        <div className="mb-4 rounded-xl border border-border/60 bg-background p-4">
          <p className="font-semibold">{post.productName}</p>
          <p className="mt-1 text-coral">¥{post.productPrice ?? '—'} · {post.productSource ?? '未知来源'}</p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => void copyText(
                [post.productName, post.productPrice != null ? `¥${post.productPrice}` : null, post.productSource]
                  .filter(Boolean)
                  .join(' · '),
                `商品信息已复制，可在${post.productSource ?? '来源平台'}搜索`,
              )}
            >
              复制商品信息
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => void copyText(`${window.location.origin}/posts/${post.id}`, '链接已复制')}
            >
              复制链接
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {post.tags.map((tag) => <span key={tag} className="text-xs text-coral">#{tag}</span>)}
      </div>
      <Separator className="my-4" />
      <p className="text-sm text-muted-foreground">
        {post.likeCount} 赞 · {post.commentCount} 评论 · {post.favoriteCount} 收藏
      </p>
    </>
  )
}
