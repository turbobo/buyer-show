import { useState } from 'react'
import { Bookmark, Heart } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ApiComment } from '@/services/comments'

export interface CommentItemProps {
  comment: ApiComment
  onReply: (comment: ApiComment) => void
  onReport: (commentId: number) => void
  onLike: (comment: ApiComment) => void
  onFavorite: (comment: ApiComment) => void
  onEdit: (comment: ApiComment, content: string) => Promise<void>
  /** G6：拉黑评论作者 */
  onBlock: (comment: ApiComment) => void
  currentUserId: number | null
}

const COMMENT_EDIT_WINDOW_MS = 5 * 60 * 1000

/** G8：楼中楼默认展示条数，超出折叠，点击「展开」显示全部。 */
const COLLAPSED_REPLY_COUNT = 3

/** 发布后 5 分钟内可编辑。 */
function isWithinEditWindow(createdAt: string): boolean {
  const time = new Date(createdAt.replace(' ', 'T')).getTime()
  return !Number.isNaN(time) && Date.now() - time < COMMENT_EDIT_WINDOW_MS
}

/** 在评论树中定位并更新指定评论（含嵌套回复）。 */
export function updateCommentTree(list: ApiComment[], commentId: number, updater: (comment: ApiComment) => ApiComment): ApiComment[] {
  return list.map((comment) => {
    if (comment.id === commentId) {
      return updater(comment)
    }
    if (comment.replies.length > 0) {
      return { ...comment, replies: updateCommentTree(comment.replies, commentId, updater) }
    }
    return comment
  })
}

/* ─── 评论项组件（树形递归渲染嵌套回复） ─── */
export function CommentItem({ comment, onReply, onReport, onLike, onFavorite, onEdit, onBlock, currentUserId }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  /** G8：楼中楼折叠（默认展示前 3 条回复） */
  const [isRepliesExpanded, setIsRepliesExpanded] = useState(false)
  const visibleReplies = isRepliesExpanded ? comment.replies : comment.replies.slice(0, COLLAPSED_REPLY_COUNT)
  const collapsedReplyCount = comment.replies.length - visibleReplies.length

  const isOwn = currentUserId != null && comment.userId === currentUserId
  const editable = isOwn && isWithinEditWindow(comment.createdAt)

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return
    setIsSavingEdit(true)
    try {
      await onEdit(comment, editContent.trim())
      setIsEditing(false)
    } catch {
      // 错误已由主组件提示，保持编辑态
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <div className="flex gap-3">
      <Avatar className="mt-0.5 h-8 w-8 shrink-0">
        <AvatarFallback className="bg-coral-light text-xs font-bold text-coral-contrast">
          {comment.userNickname?.[0] ?? '用'}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.userNickname ?? `用户${comment.userId}`}</span>
          <span className="text-xs text-muted-foreground">{comment.createdAt}</span>
          {comment.editedAt && <span className="text-xs text-muted-foreground">· 已编辑</span>}
          {comment.moderationStatus === 1 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">待审核</span>
          )}
        </div>
        {isEditing ? (
          <div className="mt-1.5 space-y-2">
            <Textarea
              value={editContent}
              maxLength={1000}
              aria-label="编辑评论内容"
              onChange={(event) => setEditContent(event.target.value)}
              className="min-h-20"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isSavingEdit}
                onClick={() => { setIsEditing(false); setEditContent(comment.content) }}
              >
                取消
              </Button>
              <Button
                size="sm"
                className="bg-coral text-white hover:bg-coral-dark"
                disabled={isSavingEdit || !editContent.trim()}
                onClick={() => void handleSaveEdit()}
              >
                {isSavingEdit ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">
            {/* G8：楼内回复展示「回复 @昵称」前缀（被回复人已删除时降级为普通文案） */}
            {comment.replyToNickname != null && (
              <span className="font-medium text-coral">回复 @{comment.replyToNickname}：</span>
            )}
            {comment.content}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => onLike(comment)}
            aria-label={comment.isLiked ? '取消点赞' : '点赞'}
            className={`flex items-center gap-1 text-xs transition-colors ${
              comment.isLiked ? 'text-coral' : 'text-muted-foreground hover:text-coral'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${comment.isLiked ? 'fill-coral' : ''}`} />
            {comment.likeCount > 0 ? comment.likeCount : '赞'}
          </button>
          <button
            type="button"
            onClick={() => onFavorite(comment)}
            aria-label={comment.isFavorited ? '取消收藏' : '收藏'}
            className={`flex items-center gap-1 text-xs transition-colors ${
              comment.isFavorited ? 'text-coral' : 'text-muted-foreground hover:text-coral'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${comment.isFavorited ? 'fill-coral' : ''}`} />
            {comment.isFavorited ? '已收藏' : '收藏'}
          </button>
          <button type="button" onClick={() => onReply(comment)} className="text-xs text-muted-foreground hover:text-coral">
            回复
          </button>
          <button type="button" onClick={() => onReport(comment.id)} className="text-xs text-muted-foreground hover:text-coral">
            举报
          </button>
          {!isOwn && (
            <button type="button" onClick={() => onBlock(comment)} className="text-xs text-muted-foreground hover:text-destructive">
              拉黑
            </button>
          )}
          {editable && !isEditing && (
            <button
              type="button"
              onClick={() => { setEditContent(comment.content); setIsEditing(true) }}
              className="text-xs text-muted-foreground hover:text-coral"
            >
              编辑
            </button>
          )}
        </div>
        {visibleReplies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-border/60 pl-4">
            {visibleReplies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                onReport={onReport}
                onLike={onLike}
                onFavorite={onFavorite}
                onEdit={onEdit}
                onBlock={onBlock}
                currentUserId={currentUserId}
              />
            ))}
            {collapsedReplyCount > 0 && (
              <button
                type="button"
                onClick={() => setIsRepliesExpanded(true)}
                className="text-xs text-muted-foreground hover:text-coral"
              >
                展开 {collapsedReplyCount} 条回复
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
