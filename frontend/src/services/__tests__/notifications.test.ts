import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getNotifications, getUnreadCount, markAllAsRead } from '../notifications'
import * as http from '../http'

// Mock the http module
vi.mock('../http', () => ({
  request: vi.fn(),
}))

describe('notifications service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNotifications', () => {
    it('should fetch notifications with default limit', async () => {
      const mockNotifications = [
        { id: 1, type: 'like', content: 'liked your post', isRead: 0 },
        { id: 2, type: 'comment', content: 'commented on your post', isRead: 1 },
      ]
      vi.mocked(http.request).mockResolvedValueOnce(mockNotifications)

      const result = await getNotifications()

      expect(http.request).toHaveBeenCalledWith('/notifications?limit=20')
      expect(result).toEqual(mockNotifications)
    })

    it('should fetch notifications with custom limit', async () => {
      const mockNotifications = [{ id: 1, type: 'follow', content: 'started following you', isRead: 0 }]
      vi.mocked(http.request).mockResolvedValueOnce(mockNotifications)

      await getNotifications(50)

      expect(http.request).toHaveBeenCalledWith('/notifications?limit=50')
    })

    it('should return empty array when no notifications', async () => {
      vi.mocked(http.request).mockResolvedValueOnce([])

      const result = await getNotifications()

      expect(result).toEqual([])
    })
  })

  describe('getUnreadCount', () => {
    it('should fetch unread count', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ count: 5 })

      const result = await getUnreadCount()

      expect(http.request).toHaveBeenCalledWith('/notifications/unread-count')
      expect(result).toEqual({ count: 5 })
    })

    it('should return zero count when no unread notifications', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ count: 0 })

      const result = await getUnreadCount()

      expect(result).toEqual({ count: 0 })
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ success: true })

      const result = await markAllAsRead()

      expect(http.request).toHaveBeenCalledWith('/notifications/mark-all-read', {
        method: 'POST',
      })
      expect(result).toEqual({ success: true })
    })
  })
})
