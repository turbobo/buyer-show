import type { ApiComment } from './comments'
import { request } from './http'
import type { ApiPost } from './posts'

export interface PendingPost extends ApiPost {
  moderationReason?: string
}

export interface PendingComment extends ApiComment {
  moderationReason?: string
}

export interface ContentReport {
  id: number
  contentType: 'POST' | 'COMMENT'
  contentId: number
  reason: string
  reporterId?: number
  reporterNickname?: string
  status: number
  createdAt: string
  postTitle?: string
  commentContent?: string
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  size: number
}

interface RawPage<T> {
  records?: T[]
  total?: number
  size?: number
  current?: number
}

/** 后端 IPage 序列化为 records/current，这里统一归一化为 list/page */
async function requestPage<T>(path: string): Promise<PageResult<T>> {
  const raw = await request<RawPage<T>>(path)
  return {
    list: raw.records ?? [],
    total: raw.total ?? 0,
    page: raw.current ?? 1,
    size: raw.size ?? 20,
  }
}

export interface PendingCounts {
  pendingPosts: number
  pendingComments: number
  pendingReports: number
}

export function getPendingCounts(): Promise<PendingCounts> {
  return request<PendingCounts>('/admin/pending-counts')
}

export function getPendingPosts(page = 1, size = 50): Promise<PageResult<PendingPost>> {
  return requestPage<PendingPost>(`/admin/moderation/posts?page=${page}&size=${size}`)
}

export function getPendingComments(page = 1, size = 50): Promise<PageResult<PendingComment>> {
  return requestPage<PendingComment>(`/admin/moderation/comments?page=${page}&size=${size}`)
}

export function getPendingReports(page = 1, size = 50): Promise<PageResult<ContentReport>> {
  return requestPage<ContentReport>(`/admin/reports?page=${page}&size=${size}`)
}

export function moderatePost(postId: number, status: number, reason?: string): Promise<void> {
  return request<void>(`/admin/moderation/posts/${postId}`, {
    method: 'POST',
    body: JSON.stringify({ status, reason }),
  })
}

export function moderateComment(commentId: number, status: number, reason?: string): Promise<void> {
  return request<void>(`/admin/moderation/comments/${commentId}`, {
    method: 'POST',
    body: JSON.stringify({ status, reason }),
  })
}

export function handleReport(reportId: number, action: 'ACCEPT' | 'REJECT', reason?: string): Promise<void> {
  return request<void>(`/admin/reports/${reportId}`, {
    method: 'POST',
    body: JSON.stringify({ action, reason }),
  })
}

// ─── 用户与内容管理（封禁/解封）─────────────────────────────────

export interface AdminUser {
  id: number
  username: string
  nickname: string
  avatarUrl: string | null
  email: string | null
  phone: string | null
  /** 角色：0 普通用户 / 1 管理员 */
  role: number
  /** 状态：0 正常 / 1 封禁 / 2 注销 */
  status: number
  postCount: number
  createdAt: string
}

export interface AdminUserPost {
  id: number
  title: string
  coverImage: string | null
  /** 审核状态：0 公开 / 1 待审 / 2 已封禁 */
  moderationStatus: number
  status: number
  createdAt: string
}

export function getAdminUsers(
  page = 1,
  size = 20,
  search?: string,
  status?: number,
): Promise<PageResult<AdminUser>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (search) params.set('search', search)
  if (status !== undefined) params.set('status', String(status))
  return requestPage<AdminUser>(`/admin/users?${params.toString()}`)
}

export function banUser(userId: number, reason?: string): Promise<void> {
  return request<void>(`/admin/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function unbanUser(userId: number): Promise<void> {
  return request<void>(`/admin/users/${userId}/unban`, { method: 'POST' })
}

export function getAdminUserPosts(
  userId: number,
  page = 1,
  size = 20,
  search?: string,
  moderationStatus?: number,
): Promise<PageResult<AdminUserPost>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (search) params.set('search', search)
  if (moderationStatus !== undefined) params.set('moderationStatus', String(moderationStatus))
  return requestPage<AdminUserPost>(`/admin/users/${userId}/posts?${params.toString()}`)
}

export interface AdminPostDetail {
  id: number
  userId: number
  userNickname: string | null
  title: string
  content: string
  images: string[]
  tags: string[] | null
  productName: string | null
  productPrice: number | null
  productSource: string | null
  productRating: number | null
  likeCount: number
  commentCount: number
  favoriteCount: number
  status: number
  moderationStatus: number
  moderationReason: string | null
  createdAt: string
}

/** 管理端帖子详情（含封禁/待审内容，供预览） */
export function getAdminPostDetail(postId: number): Promise<AdminPostDetail> {
  return request<AdminPostDetail>(`/admin/posts/${postId}`)
}

export function banAdminPost(postId: number, reason?: string): Promise<void> {
  return request<void>(`/admin/posts/${postId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function unbanAdminPost(postId: number): Promise<void> {
  return request<void>(`/admin/posts/${postId}/unban`, { method: 'POST' })
}
