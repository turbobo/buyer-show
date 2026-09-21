import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createAnnouncement,
  deleteAnnouncement,
  getLatestAnnouncement,
  listAnnouncements,
  offlineAnnouncement,
  updateAnnouncement,
} from '../announcements'
import * as http from '../http'

// Mock the http module
vi.mock('../http', () => ({
  request: vi.fn(),
}))

describe('announcements service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch latest published announcement', async () => {
    const mock = { id: 3, title: '公告', content: '内容', status: 1, createdAt: '', updatedAt: '' }
    vi.mocked(http.request).mockResolvedValueOnce(mock)

    const result = await getLatestAnnouncement()

    expect(http.request).toHaveBeenCalledWith('/announcements/latest')
    expect(result).toEqual(mock)
  })

  it('should list all announcements for admin', async () => {
    vi.mocked(http.request).mockResolvedValueOnce([])

    await listAnnouncements()

    expect(http.request).toHaveBeenCalledWith('/admin/announcements')
  })

  it('should create announcement with payload', async () => {
    const payload = { title: '新公告', content: '正文', status: 1 }
    vi.mocked(http.request).mockResolvedValueOnce({ id: 1, ...payload })

    await createAnnouncement(payload)

    expect(http.request).toHaveBeenCalledWith('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })

  it('should update announcement by id', async () => {
    const payload = { title: '改', content: '正文', status: 0 }
    vi.mocked(http.request).mockResolvedValueOnce({ id: 2, ...payload })

    await updateAnnouncement(2, payload)

    expect(http.request).toHaveBeenCalledWith('/admin/announcements/2', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  })

  it('should offline announcement by id', async () => {
    vi.mocked(http.request).mockResolvedValueOnce(undefined)

    await offlineAnnouncement(5)

    expect(http.request).toHaveBeenCalledWith('/admin/announcements/5/offline', { method: 'PUT' })
  })

  it('should delete announcement by id', async () => {
    vi.mocked(http.request).mockResolvedValueOnce(undefined)

    await deleteAnnouncement(5)

    expect(http.request).toHaveBeenCalledWith('/admin/announcements/5', { method: 'DELETE' })
  })
})
