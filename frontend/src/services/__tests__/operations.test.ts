import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getBanners,
  getTopic,
  getTopics,
  listAdminPosts,
  setFeatured,
} from '../operations'
import * as http from '../http'

// Mock the http module
vi.mock('../http', () => ({
  request: vi.fn(),
}))

describe('operations service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch active banners', async () => {
    const mock = [{ id: 1, title: '新人礼', imageUrl: 'minio/b.png', linkType: 'url', linkValue: 'https://example.com', sortOrder: 0, status: 0, createdAt: '', updatedAt: '' }]
    vi.mocked(http.request).mockResolvedValueOnce(mock)

    const result = await getBanners()

    expect(http.request).toHaveBeenCalledWith('/banners')
    expect(result).toEqual(mock)
  })

  it('should fetch active topics', async () => {
    vi.mocked(http.request).mockResolvedValueOnce([])

    await getTopics()

    expect(http.request).toHaveBeenCalledWith('/topics')
  })

  it('should fetch topic detail by id', async () => {
    vi.mocked(http.request).mockResolvedValueOnce(null)

    await getTopic('7')

    expect(http.request).toHaveBeenCalledWith('/topics/7')
  })

  it('should list admin posts with cursor and featured filter', async () => {
    vi.mocked(http.request).mockResolvedValueOnce({ list: [], nextCursor: null, hasMore: false })

    await listAdminPosts('abc', 20, 1)

    expect(http.request).toHaveBeenCalledWith('/admin/posts?size=20&cursor=abc&featured=1')
  })

  it('should omit cursor and featured when absent', async () => {
    vi.mocked(http.request).mockResolvedValueOnce({ list: [], nextCursor: null, hasMore: false })

    await listAdminPosts()

    expect(http.request).toHaveBeenCalledWith('/admin/posts?size=20')
  })

  it('should set featured via PUT', async () => {
    vi.mocked(http.request).mockResolvedValueOnce(undefined)

    await setFeatured(42, true)

    expect(http.request).toHaveBeenCalledWith('/admin/posts/42/featured', {
      method: 'PUT',
      body: JSON.stringify({ featured: true }),
    })
  })
})
