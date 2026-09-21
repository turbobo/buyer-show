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
  /** G12：商品购买链接（仅白名单域名，详情页「去购买」跳转） */
  productLink?: string
  likeCount: number
  commentCount: number
  favoriteCount: number
  moderationStatus: number
  /** 最近一次申诉状态（仅"我的帖子"列表与作者查看详情时返回；0 待处理 / 1 已通过 / 2 已驳回） */
  appealStatus?: number | null
  /** G4：正文中 @提及 的用户（昵称 + userId），详情页实时解析，供正文高亮跳转 */
  mentions?: Array<{ nickname: string; userId: number }>
  /** G5：搜索命中高亮片段（字段名 title/content -> 含 <em> 标记的片段），仅搜索接口返回 */
  highlights?: Record<string, string>
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
  /** G12：商品购买链接（可选；仅淘宝/天猫/京东/拼多多域名） */
  productLink?: string
}

export function getFeed(
  cursor?: string,
  tag?: string,
  sort = 'new',
  scope: 'all' | 'following' = 'all',
  signal?: AbortSignal,
): Promise<CursorPage<ApiPostSummary>> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  if (tag) params.set('tag', tag)
  if (sort && sort !== 'new') params.set('sort', sort)
  if (scope && scope !== 'all') params.set('scope', scope)
  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  return request<CursorPage<ApiPostSummary>>(`/posts${suffix}`, { signal })
}

export function getPost(postId: string): Promise<ApiPost> {
  return request<ApiPost>(`/posts/${postId}`)
}

/** 相关推荐（G3）：同标签最新帖召回，不足时补最新公开帖 */
export function getRelatedPosts(postId: string, limit = 6): Promise<ApiPostSummary[]> {
  return request<ApiPostSummary[]>(`/posts/${postId}/related?limit=${limit}`)
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

/** 切换收藏（G7：folderId 收藏到指定夹，不传则默认收藏夹） */
export function toggleFavorite(postId: string, folderId?: number): Promise<{ favorited: boolean }> {
  const options: RequestInit = { method: 'POST' }
  if (folderId != null) {
    options.body = JSON.stringify({ folderId })
  }
  return request<{ favorited: boolean }>(`/posts/${postId}/favorite`, options)
}
