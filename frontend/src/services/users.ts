import { request } from './http'
import type { ApiPostSummary, CursorPage } from './posts'
import type { UserProfile } from './auth'

export type { UserProfile }

export function getUserProfile(userId: number | string): Promise<UserProfile> {
  return request<UserProfile>(`/users/${userId}`)
}

export function getUserPosts(userId: number | string, cursor?: string): Promise<CursorPage<ApiPostSummary>> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return request<CursorPage<ApiPostSummary>>(`/users/${userId}/posts${query}`)
}

export function toggleFollow(userId: number): Promise<{ followed: boolean }> {
  return request<{ followed: boolean }>(`/users/${userId}/follow`, { method: 'POST' })
}
