import { request } from './http'

export interface ApiPost {
  id: number
  userId: number
  title: string
  content: string
  images: string[]
  thumbnails?: string[]
  tags: string[]
  productName?: string
  productPrice?: number
  productSource?: string
  productRating?: number
  likeCount: number
  commentCount: number
  favoriteCount: number
  moderationStatus: number
  /** 最近一次申诉状态（仅"我的帖子"列表与作者查看详情时返回；0 待处理 / 1 已通过 / 2 已驳回） */
  appealStatus?: number | null
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
  thumbnails?: string[]
  tags: string[]
  productName?: string
  productPrice?: number
  productSource?: string
  productRating?: number
}

export function getFeed(cursor?: string, tag?: string, sort = 'new', signal?: AbortSignal): Promise<CursorPage<ApiPostSummary>> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  if (tag) params.set('tag', tag)
  if (sort && sort !== 'new') params.set('sort', sort)
  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  return request<CursorPage<ApiPostSummary>>(`/posts${suffix}`, { signal })
}

export function getPost(postId: string): Promise<ApiPost> {
  return request<ApiPost>(`/posts/${postId}`)
}

export function createPost(payload: CreatePostPayload): Promise<ApiPost> {
  return request<ApiPost>('/posts', { method: 'POST', body: JSON.stringify(payload) })
}

export function updatePost(postId: string, payload: CreatePostPayload): Promise<ApiPost> {
  return request<ApiPost>(`/posts/${postId}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deletePost(postId: string): Promise<void> {
  return request<void>(`/posts/${postId}`, { method: 'DELETE' })
}

/** 发起申诉（仅已下架帖子的作者） */
export function createPostAppeal(postId: string, reason: string): Promise<void> {
  return request<void>(`/posts/${postId}/appeal`, { method: 'POST', body: JSON.stringify({ reason }) })
}

export function toggleLike(postId: string): Promise<{ liked: boolean }> {
  return request<{ liked: boolean }>(`/posts/${postId}/like`, { method: 'POST' })
}

export function toggleFavorite(postId: string): Promise<{ favorited: boolean }> {
  return request<{ favorited: boolean }>(`/posts/${postId}/favorite`, { method: 'POST' })
}
