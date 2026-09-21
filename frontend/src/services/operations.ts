// G10 运营位与话题：公开端 Banner/话题 + 管理端 Banner/话题 CRUD 与精选管理
import { request } from './http'
import type { CursorPage } from './posts'

export interface ApiBanner {
  id: number
  title: string
  imageUrl: string
  /** 跳转类型：post=帖子详情 / topic=话题页 / url=外链 */
  linkType: 'post' | 'topic' | 'url'
  linkValue: string
  sortOrder: number
  /** 0 启用 / 1 停用 */
  status: number
  createdAt: string
  updatedAt: string
}

export interface ApiTopic {
  id: number
  name: string
  coverUrl: string | null
  description: string | null
  sortOrder: number
  /** 0 启用 / 1 停用 */
  status: number
  /** 同标签（话题名）下的公开帖子数 */
  postCount: number
}

export interface AdminPostRow {
  id: number
  title: string
  isFeatured: number
  moderationStatus: number
  createdAt: string
}

export interface BannerPayload {
  title: string
  imageUrl: string
  linkType: string
  linkValue: string
  sortOrder?: number
  status?: number
}

export interface TopicPayload {
  name: string
  coverUrl?: string
  description?: string
  sortOrder?: number
  status?: number
}

// ─── 公开端 ───

/** 启用中的首页 Banner（按 sortOrder 升序） */
export function getBanners(): Promise<ApiBanner[]> {
  return request<ApiBanner[]>('/banners')
}

/** 启用中的话题列表（含帖子数） */
export function getTopics(): Promise<ApiTopic[]> {
  return request<ApiTopic[]>('/topics')
}

export function getTopic(topicId: string): Promise<ApiTopic> {
  return request<ApiTopic>(`/topics/${topicId}`)
}

// ─── 管理端：Banner 运营位 ───

export function listAdminBanners(): Promise<ApiBanner[]> {
  return request<ApiBanner[]>('/admin/banners')
}

export function createBanner(payload: BannerPayload): Promise<ApiBanner> {
  return request<ApiBanner>('/admin/banners', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateBanner(id: number, payload: BannerPayload): Promise<ApiBanner> {
  return request<ApiBanner>(`/admin/banners/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteBanner(id: number): Promise<void> {
  return request<void>(`/admin/banners/${id}`, { method: 'DELETE' })
}

// ─── 管理端：运营话题 ───

export function listAdminTopics(): Promise<ApiTopic[]> {
  return request<ApiTopic[]>('/admin/topics')
}

export function createTopic(payload: TopicPayload): Promise<ApiTopic> {
  return request<ApiTopic>('/admin/topics', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateTopic(id: number, payload: TopicPayload): Promise<ApiTopic> {
  return request<ApiTopic>(`/admin/topics/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteTopic(id: number): Promise<void> {
  return request<void>(`/admin/topics/${id}`, { method: 'DELETE' })
}

// ─── 管理端：精选流 ───

export function listAdminPosts(cursor?: string, size = 20, featured?: number): Promise<CursorPage<AdminPostRow>> {
  const params = new URLSearchParams({ size: String(size) })
  if (cursor) params.set('cursor', cursor)
  if (featured !== undefined) params.set('featured', String(featured))
  return request<CursorPage<AdminPostRow>>(`/admin/posts?${params.toString()}`)
}

export function setFeatured(postId: number, featured: boolean): Promise<void> {
  return request<void>(`/admin/posts/${postId}/featured`, {
    method: 'PUT',
    body: JSON.stringify({ featured }),
  })
}
