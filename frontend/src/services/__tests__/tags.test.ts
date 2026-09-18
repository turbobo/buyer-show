import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getHotTagStats } from '../tags'
import * as http from '../http'

// Mock the http module
vi.mock('../http', () => ({
  request: vi.fn(),
}))

describe('tags service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch hot tags with default limit 20', async () => {
    const mock = [{ tag: '美食', postCount: 12 }]
    vi.mocked(http.request).mockResolvedValueOnce(mock)

    const result = await getHotTagStats()

    expect(http.request).toHaveBeenCalledWith('/tags?limit=20')
    expect(result).toEqual(mock)
  })

  it('should pass custom limit', async () => {
    vi.mocked(http.request).mockResolvedValueOnce([])

    await getHotTagStats(5)

    expect(http.request).toHaveBeenCalledWith('/tags?limit=5')
  })
})
