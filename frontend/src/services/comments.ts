import { request } from './http'
import type { CursorPage } from './posts'

export interface ApiComment {
  id: number
  postId: number
  userId: number
  parentId: number | null
  content: string
  replyCount: number
  likeCount: number
  moderationStatus: number
  isLiked: boolean
  isFavorited: boolean
  editedAt: string | null
  createdAt: string
  userNickname?: string
  userAvatarUrl?: string
  replies: ApiComment[]
}

/** 与后端一致的分页游标编码（URL-safe Base64，无 padding）。 */
export function encodeCursor(id: number): string {
  return btoa(String(id)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function getComments(postId: string, sort: 'latest' | 'hot' = 'latest', cursor?: string, limit?: number): Promise<ApiComment[]> {
  const params = new URLSearchParams({ sort })
  if (cursor) params.set('cursor', cursor)
  if (limit) params.set('limit', String(limit))
  return request<ApiComment[]>(`/posts/${postId}/comments?${params.toString()}`)
}

export function createComment(postId: string, content: string, parentId?: number): Promise<ApiComment> {
  return request<ApiComment>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, parentId }),
  })
}

export function deleteComment(commentId: number): Promise<void> {
  return request<void>(`/comments/${commentId}`, { method: 'DELETE' })
}

export interface CommentLikeResult {
  liked: boolean
  likeCount: number
}

/** 点赞/取消点赞评论（幂等切换）。 */
export function toggleCommentLike(commentId: number): Promise<CommentLikeResult> {
  return request<CommentLikeResult>(`/comments/${commentId}/like`, { method: 'POST' })
}

/** 收藏/取消收藏评论（幂等切换）。 */
export function toggleCommentFavorite(commentId: number): Promise<{ favorited: boolean }> {
  return request<{ favorited: boolean }>(`/comments/${commentId}/favorite`, { method: 'POST' })
}

/** 编辑评论（发布后 5 分钟内）。 */
export function updateComment(commentId: number, content: string): Promise<void> {
  return request<void>(`/comments/${commentId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  })
}

/** 当前用户收藏的评论（游标分页）。 */
export function getFavoriteComments(cursor?: string, size = 20): Promise<CursorPage<UserComment>> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  params.set('size', String(size))
  return request<CursorPage<UserComment>>(`/users/me/favorite-comments?${params.toString()}`)
}

export interface UserComment {
  id: number
  postId: number
  postTitle: string
  content: string
  moderationStatus: number
  createdAt: string
}

/** 当前用户的评论（含待审/未通过，仅本人可见，游标分页）。 */
export function getUserComments(cursor?: string, size = 20): Promise<CursorPage<UserComment>> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  params.set('size', String(size))
  return request<CursorPage<UserComment>>(`/users/me/comments?${params.toString()}`)
}
