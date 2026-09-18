import { describe, it, expect } from 'vitest'
import { distributePosts, cardImageClass } from '../waterfall'
import type { ApiPostSummary } from '@/services/posts'

function makePost(id: number, overrides: Partial<ApiPostSummary> = {}): ApiPostSummary {
  return {
    id,
    userId: 1,
    title: `Post ${id}`,
    images: [],
    tags: [],
    likeCount: 0,
    commentCount: 0,
    favoriteCount: 0,
    moderationStatus: 1,
    isLiked: false,
    isFavorited: false,
    createdAt: '2026-09-01T00:00:00Z',
    userNickname: 'user',
    ...overrides,
  }
}

describe('waterfall', () => {
  describe('distributePosts', () => {
    it('should return the requested number of columns', () => {
      const result = distributePosts([], 3)
      expect(result).toHaveLength(3)
      expect(result.every((column) => column.length === 0)).toBe(true)
    })

    it('should assign every post exactly once', () => {
      const posts = [makePost(1), makePost(2), makePost(3), makePost(4), makePost(5)]
      const result = distributePosts(posts, 3)

      const assigned = result.flat()
      expect(assigned).toHaveLength(5)
      const ids = assigned.map((post) => post.id).sort((a, b) => a - b)
      expect(ids).toEqual([1, 2, 3, 4, 5])
    })

    it('should spread posts across columns when fewer than columns', () => {
      // 初始高度全 0：每个新帖进入当前最短列，两帖必然落不同列
      const result = distributePosts([makePost(1), makePost(2)], 3)
      expect(result[0].map((p) => p.id)).toEqual([1])
      expect(result[1].map((p) => p.id)).toEqual([2])
      expect(result[2]).toHaveLength(0)
    })

    it('should assign to the shortest column first (deterministic hash heights)', () => {
      // 基于确定性 hash 的卡片高度：id=1 → 1360、id=2 → 1443.33、id=3 → 1310、id=4 → 1110
      // 第 4 帖时各列累计高度：col0=1360, col1=1443.33, col2=1310 → 落 col2
      const result = distributePosts([makePost(1), makePost(2), makePost(3), makePost(4)], 3)
      expect(result.map((column) => column.map((post) => post.id))).toEqual([[1], [2], [3, 4]])
    })
  })

  describe('cardImageClass', () => {
    it('should be deterministic for the same id', () => {
      expect(cardImageClass(1)).toBe(cardImageClass(1))
      expect(cardImageClass(42)).toBe(cardImageClass(42))
    })

    it('should only produce the four supported aspect classes', () => {
      const supported = new Set(['aspect-[3/4]', 'aspect-square', 'aspect-[4/5]', 'aspect-[5/6]'])
      for (let id = 1; id <= 20; id++) {
        expect(supported.has(cardImageClass(id))).toBe(true)
      }
    })
  })
})
