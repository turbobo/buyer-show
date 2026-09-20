import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFeed, getPost, createPost, toggleLike, toggleFavorite } from '../posts'
import * as http from '../http'

// Mock the http module
vi.mock('../http', () => ({
  request: vi.fn(),
  upload: vi.fn(),
}))

describe('posts service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getFeed', () => {
    it('should fetch feed without cursor or tag', async () => {
      const mockFeed = {
        list: [{ id: 1, title: 'Post 1' }],
        nextCursor: 'cursor123',
        hasMore: true,
      }
      vi.mocked(http.request).mockResolvedValueOnce(mockFeed)

      const result = await getFeed()

      expect(http.request).toHaveBeenCalledWith('/posts', { signal: undefined })
      expect(result).toEqual(mockFeed)
    })

    it('should fetch feed with cursor', async () => {
      const mockFeed = { list: [], nextCursor: null, hasMore: false }
      vi.mocked(http.request).mockResolvedValueOnce(mockFeed)

      await getFeed('cursor123')

      expect(http.request).toHaveBeenCalledWith('/posts?cursor=cursor123', { signal: undefined })
    })

    it('should fetch feed with tag', async () => {
      const mockFeed = { list: [], nextCursor: null, hasMore: false }
      vi.mocked(http.request).mockResolvedValueOnce(mockFeed)

      await getFeed(undefined, '美食')

      expect(http.request).toHaveBeenCalledWith('/posts?tag=%E7%BE%8E%E9%A3%9F', { signal: undefined })
    })

    it('should fetch feed with cursor and tag', async () => {
      const mockFeed = { list: [], nextCursor: null, hasMore: false }
      vi.mocked(http.request).mockResolvedValueOnce(mockFeed)

      await getFeed('cursor123', '美食')

      expect(http.request).toHaveBeenCalledWith('/posts?cursor=cursor123&tag=%E7%BE%8E%E9%A3%9F', { signal: undefined })
    })

    it('should fetch feed with hot sort', async () => {
      const mockFeed = { list: [], nextCursor: null, hasMore: false }
      vi.mocked(http.request).mockResolvedValueOnce(mockFeed)

      await getFeed(undefined, undefined, 'hot')

      expect(http.request).toHaveBeenCalledWith('/posts?sort=hot', { signal: undefined })
    })

    it('should not include sort param when sort is "new"', async () => {
      const mockFeed = { list: [], nextCursor: null, hasMore: false }
      vi.mocked(http.request).mockResolvedValueOnce(mockFeed)

      await getFeed(undefined, undefined, 'new')

      expect(http.request).toHaveBeenCalledWith('/posts', { signal: undefined })
    })

    it('should pass abort signal', async () => {
      const mockFeed = { list: [], nextCursor: null, hasMore: false }
      vi.mocked(http.request).mockResolvedValueOnce(mockFeed)

      const controller = new AbortController()
      await getFeed(undefined, undefined, 'new', 'all', controller.signal)

      expect(http.request).toHaveBeenCalledWith('/posts', { signal: controller.signal })
    })

    it('should include scope param when scope is following', async () => {
      const mockFeed = { list: [], nextCursor: null, hasMore: false }
      vi.mocked(http.request).mockResolvedValueOnce(mockFeed)

      await getFeed(undefined, undefined, 'new', 'following')

      expect(http.request).toHaveBeenCalledWith('/posts?scope=following', { signal: undefined })
    })
  })

  describe('getPost', () => {
    it('should fetch post by id', async () => {
      const mockPost = { id: 1, title: 'Test Post', content: 'Content' }
      vi.mocked(http.request).mockResolvedValueOnce(mockPost)

      const result = await getPost('1')

      expect(http.request).toHaveBeenCalledWith('/posts/1')
      expect(result).toEqual(mockPost)
    })
  })

  describe('createPost', () => {
    it('should create post with payload', async () => {
      const payload = {
        title: 'New Post',
        content: 'Post content',
        images: ['image1.jpg'],
        tags: ['美食', '旅行'],
      }
      const mockPost = { id: 1, ...payload }
      vi.mocked(http.request).mockResolvedValueOnce(mockPost)

      const result = await createPost(payload)

      expect(http.request).toHaveBeenCalledWith('/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      expect(result).toEqual(mockPost)
    })
  })

  describe('toggleLike', () => {
    it('should toggle like on post', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ liked: true })

      const result = await toggleLike('1')

      expect(http.request).toHaveBeenCalledWith('/posts/1/like', { method: 'POST' })
      expect(result).toEqual({ liked: true })
    })
  })

  describe('toggleFavorite', () => {
    it('should toggle favorite on post', async () => {
      vi.mocked(http.request).mockResolvedValueOnce({ favorited: true })

      const result = await toggleFavorite('1')

      expect(http.request).toHaveBeenCalledWith('/posts/1/favorite', { method: 'POST' })
      expect(result).toEqual({ favorited: true })
    })
  })
})
