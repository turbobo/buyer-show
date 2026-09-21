import { request } from './http'

/** 系统公告（G11）：公开端 latest + 管理端 CRUD 共用。 */
export interface Announcement {
  id: number
  title: string
  content: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface AnnouncementPayload {
  title: string
  content: string
  status: number
}

/** 公开端：最近一条已发布公告（无公告时返回 null）。 */
export function getLatestAnnouncement(): Promise<Announcement | null> {
  return request<Announcement | null>('/announcements/latest')
}

/** 管理端：全部公告（新在前）。 */
export function listAnnouncements(): Promise<Announcement[]> {
  return request<Announcement[]>('/admin/announcements')
}

export function createAnnouncement(payload: AnnouncementPayload): Promise<Announcement> {
  return request<Announcement>('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAnnouncement(id: number, payload: AnnouncementPayload): Promise<Announcement> {
  return request<Announcement>(`/admin/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function offlineAnnouncement(id: number): Promise<void> {
  return request<void>(`/admin/announcements/${id}/offline`, { method: 'PUT' })
}

export function deleteAnnouncement(id: number): Promise<void> {
  return request<void>(`/admin/announcements/${id}`, { method: 'DELETE' })
}
