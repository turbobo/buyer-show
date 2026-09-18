import { Bookmark, Heart, Send, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ApiComment } from '@/services/comments'

interface ActionBarProps {
  commentText: string
  replyTarget: ApiComment | null
  isCommentSubmitting: boolean
  isLikeSubmitting: boolean
  isFavoriteSubmitting: boolean
  isLiked: boolean
  isFavorited: boolean
  onCommentTextChange: (value: string) => void
  onSubmitComment: () => void
  onClearReply: () => void
  onLike: () => void
  onFavorite: () => void
  onShare: () => void
}

/* ─── 详情页底部操作栏（评论输入 + 点赞/收藏/分享） ─── */
export function ActionBar({
  commentText,
  replyTarget,
  isCommentSubmitting,
  isLikeSubmitting,
  isFavoriteSubmitting,
  isLiked,
  isFavorited,
  onCommentTextChange,
  onSubmitComment,
  onClearReply,
  onLike,
  onFavorite,
  onShare,
}: ActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        <div className="relative flex-1">
          <Input
            aria-label="评论内容"
            value={commentText}
            onChange={(event) => onCommentTextChange(event.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmitComment() } }}
            placeholder={replyTarget ? `回复 ${replyTarget.userNickname ?? '用户'}...` : '说点什么...'}
            className="h-10 rounded-full bg-muted/50 pr-10"
          />
          <Button
            aria-label="发送评论"
            disabled={isCommentSubmitting || !commentText.trim()}
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-coral text-white hover:bg-coral-dark disabled:opacity-40"
            onClick={onSubmitComment}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button aria-label={isLiked ? '取消点赞' : '点赞'} disabled={isLikeSubmitting} variant="ghost" size="icon" onClick={onLike}>
          <Heart className={`h-5 w-5 ${isLiked ? 'fill-coral text-coral' : ''}`} />
        </Button>
        <Button aria-label={isFavorited ? '取消收藏' : '收藏'} disabled={isFavoriteSubmitting} variant="ghost" size="icon" onClick={onFavorite}>
          <Bookmark className={`h-5 w-5 ${isFavorited ? 'fill-coral text-coral' : ''}`} />
        </Button>
        <Button aria-label="分享" variant="ghost" size="icon" onClick={onShare}>
          <Share2 className="h-5 w-5" />
        </Button>
      </div>
      {replyTarget && (
        <div className="mx-auto max-w-5xl px-4 pb-2">
          <button
            type="button"
            onClick={onClearReply}
            className="flex items-center gap-1 text-xs text-coral hover:underline"
          >
            回复 {replyTarget.userNickname ?? '用户'} ×
          </button>
        </div>
      )}
    </div>
  )
}
