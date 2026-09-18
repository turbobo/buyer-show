import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getUserProfile,
  getUserPosts,
  getMyPosts,
  getUserFavorites,
  getUserLikes,
  getFollowers,
  getFollowing,
  toggleFollow,
  updateProfile,
} from '../users'
import * as http from '../http'

// Mock the http module
vi.mock('../http', () => ({
  request: vi.fn(),
}))

describe('users service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserProfile', () => {
    it('should fetch profile by id', async () => {
      const mock = { id: 5, nickname: 'Alice' }
      vi.mocked(http.request).mockResolvedValueOnce(mock)

      const result = await getUserProfile(5)

      expect(http.request).toHaveBeenCalledWith('/users/5')
      expect(result).toEqual(mock)
    })
  })

  describe('getUserPosts', () => {
    it('should fetch user posts without cursor', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ list: [], nextCursor: null, hasMore: false })

      await getUserPosts(5)

      expect(http.request).toHaveBeenCalledWith('/users/5/posts')
    })

    it('should encode cursor in query', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ list: [], nextCursor: null, hasMore: false })

      await getUserPosts(5, 'a+b/=')

      expect(http.request).toHaveBeenCalledWith('/users/5/posts?cursor=a%2Bb%2F%3D')
    })
  })

  describe('getMyPosts', () => {
    it('should fetch own posts without cursor', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ list: [], nextCursor: null, hasMore: false })

      await getMyPosts()

      expect(http.request).toHaveBeenCalledWith('/users/me/posts')
    })
  })

  describe('getUserFavorites / getUserLikes', () => {
    it('should fetch user favorites', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ list: [], nextCursor: null, hasMore: false })

      await getUserFavorites(5)

      expect(http.request).toHaveBeenCalledWith('/users/5/favorites')
    })

    it('should fetch user likes', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ list: [], nextCursor: null, hasMore: false })

      await getUserLikes(5)

      expect(http.request).toHaveBeenCalledWith('/users/5/likes')
    })
  })

  describe('getFollowers / getFollowing', () => {
    it('should fetch followers', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ list: [], nextCursor: null, hasMore: false })

      await getFollowers(5)

      expect(http.request).toHaveBeenCalledWith('/users/5/followers')
    })

    it('should fetch following', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ list: [], nextCursor: null, hasMore: false })

      await getFollowing(5)

      expect(http.request).toHaveBeenCalledWith('/users/5/following')
    })
  })

  describe('toggleFollow', () => {
    it('should toggle follow', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ followed: true })

      const result = await toggleFollow(5)

      expect(http.request).toHaveBeenCalledWith('/users/5/follow', { method: 'POST' })
      expect(result).toEqual({ followed: true })
    })
  })

  describe('updateProfile', () => {
    it('should update profile via PUT', async () => {
      const payload = { nickname: 'New', bio: 'Hello' }
      vi.mocked(http.request).mockResolvedValueOnce({ id: 1, ...payload })

      await updateProfile(payload)

      expect(http.request).toHaveBeenCalledWith('/users/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    })
  })
})
