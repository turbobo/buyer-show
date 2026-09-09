import { request } from './http'

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

export function getComments(postId: string): Promise<ApiComment[]> {
  return request<ApiComment[]>(`/posts/${postId}/comments`)
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
