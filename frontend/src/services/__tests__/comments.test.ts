import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getComments,
  createComment,
  deleteComment,
  toggleCommentLike,
  toggleCommentFavorite,
  updateComment,
  getFavoriteComments,
  getUserComments,
  encodeCursor,
} from '../comments'
import * as http from '../http'

// Mock the http module
vi.mock('../http', () => ({
  request: vi.fn(),
}))

describe('comments service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('encodeCursor', () => {
    it('should produce URL-safe base64 without padding', () => {
      expect(encodeCursor(1)).toBe('MQ')
      expect(encodeCursor(0)).toBe('MA')
      expect(encodeCursor(123456789)).toBe(btoa('123456789').replace(/=+$/, ''))
      // 无 padding、无 +、无 /
      expect(encodeCursor(999999999)).not.toMatch(/[+/=]/)
    })
  })

  describe('getComments', () => {
    it('should fetch comments with default sort', async () => {
      vi.mocked(http.request).mockResolvedValueOnce([])

      await getComments('1')

      expect(http.request).toHaveBeenCalledWith('/posts/1/comments?sort=latest')
    })

    it('should pass sort, cursor and limit params', async () => {
      vi.mocked(http.request).mockResolvedValueOnce([])

      await getComments('1', 'hot', 'cursor-abc', 10)

      expect(http.request).toHaveBeenCalledWith('/posts/1/comments?sort=hot&cursor=cursor-abc&limit=10')
    })

    it('should omit optional params when absent', async () => {
      vi.mocked(http.request).mockResolvedValueOnce([])

      await getComments('1', 'hot')

      expect(http.request).toHaveBeenCalledWith('/posts/1/comments?sort=hot')
    })
  })

  describe('createComment', () => {
    it('should create top-level comment', async () => {
      const mock = { id: 1, content: 'hi' }
      vi.mocked(http.request).mockResolvedValueOnce(mock)

      const result = await createComment('1', 'hi')

      expect(http.request).toHaveBeenCalledWith('/posts/1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'hi', parentId: undefined }),
      })
      expect(result).toEqual(mock)
    })

    it('should create reply with parentId', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({})

      await createComment('1', 'reply', 42)

      expect(http.request).toHaveBeenCalledWith('/posts/1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'reply', parentId: 42 }),
      })
    })
  })

  describe('deleteComment', () => {
    it('should delete comment by id', async () => {
      vi.mocked(http.request).mockResolvedValueOnce(undefined)

      await deleteComment(3)

      expect(http.request).toHaveBeenCalledWith('/comments/3', { method: 'DELETE' })
    })
  })

  describe('toggleCommentLike / toggleCommentFavorite', () => {
    it('should toggle like on comment', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ liked: true, likeCount: 2 })

      const result = await toggleCommentLike(3)

      expect(http.request).toHaveBeenCalledWith('/comments/3/like', { method: 'POST' })
      expect(result).toEqual({ liked: true, likeCount: 2 })
    })

    it('should toggle favorite on comment', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ favorited: true })

      const result = await toggleCommentFavorite(3)

      expect(http.request).toHaveBeenCalledWith('/comments/3/favorite', { method: 'POST' })
      expect(result).toEqual({ favorited: true })
    })
  })

  describe('updateComment', () => {
    it('should update comment content via PUT', async () => {
      vi.mocked(http.request).mockResolvedValueOnce(undefined)

      await updateComment(3, 'edited')

      expect(http.request).toHaveBeenCalledWith('/comments/3', {
        method: 'PUT',
        body: JSON.stringify({ content: 'edited' }),
      })
    })
  })

  describe('getFavoriteComments / getUserComments', () => {
    it('should fetch favorite comments with default size', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ list: [], nextCursor: null, hasMore: false })

      await getFavoriteComments()

      expect(http.request).toHaveBeenCalledWith('/users/me/favorite-comments?size=20')
    })

    it('should fetch user comments with cursor and size', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ list: [], nextCursor: null, hasMore: false })

      await getUserComments('cursor-x', 10)

      expect(http.request).toHaveBeenCalledWith('/users/me/comments?cursor=cursor-x&size=10')
    })
  })
})
