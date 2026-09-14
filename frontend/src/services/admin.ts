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

export function getPendingPosts(page = 1, size = 50): Promise<PageResult<PendingPost>> {
  return request<PageResult<PendingPost>>(`/admin/moderation/posts?page=${page}&size=${size}`)
}

export function getPendingComments(page = 1, size = 50): Promise<PageResult<PendingComment>> {
  return request<PageResult<PendingComment>>(`/admin/moderation/comments?page=${page}&size=${size}`)
}

export function getPendingReports(page = 1, size = 50): Promise<PageResult<ContentReport>> {
  return request<PageResult<ContentReport>>(`/admin/reports?page=${page}&size=${size}`)
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
