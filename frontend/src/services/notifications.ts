import { request } from './http'

export interface Notification {
  id: number
  type: 'like' | 'comment' | 'follow' | 'system' | 'mention'
  content: string
  isRead: number
  createdAt: string
  targetType?: string
  targetId?: number
  actorId: number
  actorNickname: string
  actorAvatarUrl?: string
}

export function getNotifications(limit = 20): Promise<Notification[]> {
  return request<Notification[]>(`/notifications?limit=${limit}`)
}

export function getUnreadCount(): Promise<{ count: number }> {
  return request<{ count: number }>('/notifications/unread-count')
}

export function markAllAsRead(): Promise<void> {
  return request<void>('/notifications/mark-all-read', { method: 'POST' })
}
