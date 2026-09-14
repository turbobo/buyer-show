import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { request, ApiError, saveTokens, clearTokens, getAccessToken } from '../http'

// Mock fetch
global.fetch = vi.fn()

// Helper to create a mock JWT token with configurable expiry
function createMockToken(expOffsetSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ sub: '1', role: 'user', exp: Math.floor(Date.now() / 1000) + expOffsetSeconds }))
  return `${header}.${payload}.signature`
}

describe('http service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('token management', () => {
    it('should save and retrieve tokens', () => {
      saveTokens('access-token', 'refresh-token')
      expect(getAccessToken()).toBe('access-token')
      expect(localStorage.getItem('buyer-show.refresh-token')).toBe('refresh-token')
    })

    it('should clear tokens', () => {
      saveTokens('access-token', 'refresh-token')
      clearTokens()
      expect(getAccessToken()).toBeNull()
      expect(localStorage.getItem('buyer-show.refresh-token')).toBeNull()
    })
  })

  describe('request function', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, title: 'Test Post' }
      const mockResponse = { code: 0, data: mockData, message: 'success' }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response)

      const result = await request('/posts/1')
      expect(result).toEqual(mockData)
      expect(fetch).toHaveBeenCalledWith('/api/v1/posts/1', expect.any(Object))
    })

    it('should throw ApiError on non-zero code', async () => {
      const mockResponse = { code: 404, data: null, message: 'Post not found' }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response)

      try {
        await request('/posts/999')
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        expect((err as ApiError).code).toBe(404)
        expect((err as ApiError).message).toBe('Post not found')
      }
    })

    it('should throw ApiError on HTTP error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ code: 500, data: null, message: 'Internal error' }),
      } as Response)

      await expect(request('/posts/1')).rejects.toThrow(ApiError)
    })

    it('should include Authorization header when token exists and is valid', async () => {
      // Create a token that expires in 1 hour (well within valid range)
      const validToken = createMockToken(3600)
      saveTokens(validToken, 'refresh-token')

      const mockResponse = { code: 0, data: {}, message: 'success' }
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response)

      await request('/posts')

      const callArgs = vi.mocked(fetch).mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Authorization')).toBe(`Bearer ${validToken}`)
    })

    it('should refresh token proactively when token is about to expire', async () => {
      // Create a token that expires in 10 seconds (within REFRESH_AHEAD_SECONDS=30)
      const expiringToken = createMockToken(10)
      saveTokens(expiringToken, 'valid-refresh-token')

      // Refresh token call
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: 0,
          data: { accessToken: createMockToken(3600), refreshToken: 'new-refresh-token' },
          message: 'success',
        }),
      } as Response)

      // Actual request with new token
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { id: 1 }, message: 'success' }),
      } as Response)

      const result = await request('/posts/1')
      expect(result).toEqual({ id: 1 })
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('should retry on 401 response', async () => {
      const validToken = createMockToken(3600)
      saveTokens(validToken, 'valid-refresh-token')

      // First call returns 401
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ code: 401, data: null, message: 'Unauthorized' }),
      } as Response)

      // Refresh token call
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: 0,
          data: { accessToken: createMockToken(3600), refreshToken: 'new-refresh-token' },
          message: 'success',
        }),
      } as Response)

      // Retry with new token succeeds
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { id: 1 }, message: 'success' }),
      } as Response)

      const result = await request('/posts/1')
      expect(result).toEqual({ id: 1 })
      expect(fetch).toHaveBeenCalledTimes(3)
    })

    it('should throw when refresh fails on 401', async () => {
      const validToken = createMockToken(3600)
      saveTokens(validToken, 'invalid-refresh-token')

      // First call returns 401
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ code: 401, data: null, message: 'Unauthorized' }),
      } as Response)

      // Refresh token call fails
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ code: 401, data: null, message: 'Invalid refresh token' }),
      } as Response)

      // Since refresh fails, the original 401 response is processed
      await expect(request('/posts/1')).rejects.toThrow(ApiError)
    })
  })
})
