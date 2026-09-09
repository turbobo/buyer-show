import { request } from './http'

export interface PageResult<T> {
  records: T[]
  current: number
  size: number
  total: number
}

export interface PendingPost {
  id: number
  userId: number
  title: string
  content: string
  images: string[]
  moderationReason?: string
  createdAt: string
}

export interface PendingComment {
  id: number
  postId: number
  userId: number
  parentId: number | null
  content: string
  moderationReason?: string
  createdAt: string
}

export interface ContentReport {
  id: number
  reporterId: number
  contentType: number
  contentId: number
  reason: string
  description?: string
  createdAt: string
}

export function getPendingPosts(): Promise<PageResult<PendingPost>> {
  return request<PageResult<PendingPost>>('/admin/moderation/posts?page=1&size=50')
}

export function getPendingComments(): Promise<PageResult<PendingComment>> {
  return request<PageResult<PendingComment>>('/admin/moderation/comments?page=1&size=50')
}

export function getPendingReports(): Promise<PageResult<ContentReport>> {
  return request<PageResult<ContentReport>>('/admin/reports?page=1&size=50')
}

export function moderatePost(id: number, action: 'APPROVE' | 'REJECT', reason?: string): Promise<void> {
  return request<void>(`/admin/moderation/posts/${id}`, { method: 'POST', body: JSON.stringify({ action, reason }) })
}

export function moderateComment(id: number, action: 'APPROVE' | 'REJECT', reason?: string): Promise<void> {
  return request<void>(`/admin/moderation/comments/${id}`, { method: 'POST', body: JSON.stringify({ action, reason }) })
}

export function handleReport(id: number, action: 'ACCEPT' | 'DISMISS'): Promise<void> {
  return request<void>(`/admin/reports/${id}`, { method: 'POST', body: JSON.stringify({ action }) })
}
