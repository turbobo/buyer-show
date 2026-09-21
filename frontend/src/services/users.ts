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

/** 我的帖子（含待审/未通过，仅本人可访问） */
export function getMyPosts(cursor?: string): Promise<CursorPage<ApiPostSummary>> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return request<CursorPage<ApiPostSummary>>(`/users/me/posts${query}`)
}

/** 用户收藏的公开帖子（按收藏时间倒序；G7：folderId 收藏夹筛选） */
export function getUserFavorites(userId: number | string, cursor?: string, folderId?: number): Promise<CursorPage<ApiPostSummary>> {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  if (folderId != null) params.set('folderId', String(folderId))
  const query = params.size > 0 ? `?${params.toString()}` : ''
  return request<CursorPage<ApiPostSummary>>(`/users/${userId}/favorites${query}`)
}

/** 用户点赞过的公开帖子（按点赞时间倒序） */
export function getUserLikes(userId: number | string, cursor?: string): Promise<CursorPage<ApiPostSummary>> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return request<CursorPage<ApiPostSummary>>(`/users/${userId}/likes${query}`)
}

export interface FollowUser {
  id: number
  nickname: string
  avatarUrl: string | null
  bio: string | null
  isFollowing: boolean
  mutual: boolean
}

/** 粉丝列表（按关注时间倒序） */
export function getFollowers(userId: number | string, cursor?: string): Promise<CursorPage<FollowUser>> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return request<CursorPage<FollowUser>>(`/users/${userId}/followers${query}`)
}

/** 关注列表（按关注时间倒序） */
export function getFollowing(userId: number | string, cursor?: string): Promise<CursorPage<FollowUser>> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return request<CursorPage<FollowUser>>(`/users/${userId}/following${query}`)
}

export function toggleFollow(userId: number): Promise<{ followed: boolean }> {
  return request<{ followed: boolean }>(`/users/${userId}/follow`, { method: 'POST' })
}

/** G6 拉黑用户：内容互不可见 + 禁私信 + 自动双向取关 */
export function blockUser(userId: number): Promise<boolean> {
  return request<boolean>(`/users/${userId}/block`, { method: 'POST' })
}

/** G6 解除拉黑 */
export function unblockUser(userId: number): Promise<boolean> {
  return request<boolean>(`/users/${userId}/block`, { method: 'DELETE' })
}

export interface BlockedUser {
  id: number
  nickname: string
  avatarUrl: string | null
  blockedAt: string
}

/** G6 我的拉黑列表（按拉黑时间倒序） */
export function getBlockedUsers(): Promise<BlockedUser[]> {
  return request<BlockedUser[]>('/users/me/blocks')
}

export interface UpdateProfilePayload {
  nickname?: string
  bio?: string
  avatarUrl?: string
}

export function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  return request<UserProfile>('/users/me', { method: 'PUT', body: JSON.stringify(payload) })
}

/* ─── G7 收藏夹 ─── */

export interface FavoriteFolder {
  id: number
  name: string
  postCount: number
}

/** 我的收藏夹列表（含收藏数；默认夹由前端合成） */
export function getMyFolders(): Promise<FavoriteFolder[]> {
  return request<FavoriteFolder[]>('/users/me/folders')
}

export function createFolder(name: string): Promise<FavoriteFolder> {
  return request<FavoriteFolder>('/users/me/folders', { method: 'POST', body: JSON.stringify({ name }) })
}

export function renameFolder(folderId: number, name: string): Promise<void> {
  return request<void>(`/users/me/folders/${folderId}`, { method: 'PUT', body: JSON.stringify({ name }) })
}

export function deleteFolder(folderId: number): Promise<void> {
  return request<void>(`/users/me/folders/${folderId}`, { method: 'DELETE' })
}

/** 移动收藏到指定夹（folderId 为 null 表示默认夹） */
export function moveFavorite(postId: number | string, folderId: number | null): Promise<void> {
  return request<void>(`/users/me/favorites/${postId}/move`, { method: 'POST', body: JSON.stringify({ folderId }) })
}
