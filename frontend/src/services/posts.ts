import { request } from './http'

export interface ApiPost {
  id: number
  userId: number
  title: string
  content: string
  images: string[]
  tags: string[]
  productName?: string
  productPrice?: number
  productSource?: string
  productRating?: number
  likeCount: number
  commentCount: number
  favoriteCount: number
  moderationStatus: number
  isLiked: boolean
  isFavorited: boolean
  createdAt: string
  userNickname: string
  userAvatarUrl?: string
}

export type ApiPostSummary = Omit<ApiPost, 'content'>

export interface CursorPage<T> {
  list: T[]
  nextCursor: string | null
  hasMore: boolean
}

export interface CreatePostPayload {
  title: string
  content: string
  images: string[]
  tags: string[]
  productName?: string
  productPrice?: number
  productSource?: string
  productRating?: number
}

export function getFeed(cursor?: string, tag?: string, signal?: AbortSignal): Promise<CursorPage<ApiPostSummary>> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  if (tag) params.set('tag', tag)
  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  return request<CursorPage<ApiPostSummary>>(`/posts${suffix}`, { signal })
}

export function getPost(postId: string): Promise<ApiPost> {
  return request<ApiPost>(`/posts/${postId}`)
}

export function createPost(payload: CreatePostPayload): Promise<ApiPost> {
  return request<ApiPost>('/posts', { method: 'POST', body: JSON.stringify(payload) })
}

export function toggleLike(postId: string): Promise<{ liked: boolean }> {
  return request<{ liked: boolean }>(`/posts/${postId}/like`, { method: 'POST' })
}

export function toggleFavorite(postId: string): Promise<{ favorited: boolean }> {
  return request<{ favorited: boolean }>(`/posts/${postId}/favorite`, { method: 'POST' })
}
