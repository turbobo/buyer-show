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
  createdAt: string
  userNickname?: string
  userAvatarUrl?: string
  replies: ApiComment[]
}

export function getComments(postId: string, sort: 'latest' | 'hot' = 'latest'): Promise<ApiComment[]> {
  return request<ApiComment[]>(`/posts/${postId}/comments?sort=${sort}`)
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
