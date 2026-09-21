import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
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

/* ─── G4 正文分段解析（@提及 + #话题#） ─── */

/** 正文识别规则与后端 MentionExtractor 保持一致：#话题#（1-20 非 # 非空白字符）与 @昵称（2-20 字符，负向 lookbehind 防邮箱误匹配） */
const CONTENT_SEGMENT_PATTERN = /(#([^#\s]{1,20})#)|((?<![\w@])@([a-zA-Z0-9_\-\u4e00-\u9fa5]{2,20}))/g

/**
 * 将正文拆分为「纯文本 / 话题按钮 / 提及按钮」节点列表（纯函数，便于单测）。
 * @提及 仅当昵称出现在服务端返回的 mentions 中时才可点击跳转（防止伪造链接）；
 * 未匹配到的 @昵称 仅高亮不可点（历史数据/非活跃用户）。
 */
export function renderContentSegments(
  content: string,
  mentions: ApiPost['mentions'],
  onTopicClick: (topic: string) => void,
  onMentionClick: (userId: number) => void,
): ReactNode[] {
  const segments: ReactNode[] = []
  const mentionUserIds = new Map((mentions ?? []).map((item) => [item.nickname, item.userId]))
  let lastIndex = 0
  let match: RegExpExecArray | null
  CONTENT_SEGMENT_PATTERN.lastIndex = 0
  while ((match = CONTENT_SEGMENT_PATTERN.exec(content)) !== null) {
    if (match.index > lastIndex) segments.push(content.slice(lastIndex, match.index))
    const segmentKey = `${match.index}-${match[0]}`
    if (match[1] != null) {
      const topic = match[2]
      segments.push(
        <button key={segmentKey} type="button" onClick={() => onTopicClick(topic)} className="font-medium text-coral hover:underline">
          #{topic}#
        </button>,
      )
    } else {
      const nickname = match[4]
      const userId = mentionUserIds.get(nickname)
      segments.push(
        userId != null ? (
          <button key={segmentKey} type="button" onClick={() => onMentionClick(userId)} className="font-medium text-coral hover:underline">
            @{nickname}
          </button>
        ) : (
          <span key={segmentKey} className="font-medium text-coral">@{nickname}</span>
        ),
      )
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < content.length) segments.push(content.slice(lastIndex))
  return segments
}

/* ─── 帖子内容子组件（标题/正文/商品卡/标签/统计） ─── */
export function PostContent({ post }: { post: ApiPost }) {
  const { toast } = useToast()
  const navigate = useNavigate()

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
      {/* G4：#话题# 跳标签 Feed、@昵称 跳用户主页（whitespace-pre-wrap 保留换行） */}
      <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
        {renderContentSegments(
          post.content,
          post.mentions,
          (topic) => navigate(`/?tag=${encodeURIComponent(topic)}`),
          (userId) => navigate(`/user/${userId}`),
        )}
      </p>
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
      {/* G4：标签 chips 可点击直达话题 Feed */}
      <div className="flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => navigate(`/?tag=${encodeURIComponent(tag)}`)}
            className="text-xs text-coral hover:underline"
          >
            #{tag}
          </button>
        ))}
      </div>
      <Separator className="my-4" />
      <p className="text-sm text-muted-foreground">
        {post.likeCount} 赞 · {post.commentCount} 评论 · {post.favoriteCount} 收藏
      </p>
    </>
  )
}
