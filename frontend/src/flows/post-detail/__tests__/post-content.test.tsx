import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PostContent, buildPostJsonLd } from '../post-content'
import type { ApiPost } from '@/services/posts'

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: toastMock }),
}))

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }))

function makePost(overrides: Partial<ApiPost> = {}): ApiPost {
  return {
    id: 1,
    userId: 2,
    title: '好物分享',
    content: '这是一篇正文内容',
    images: [],
    tags: ['美食', '旅行'],
    likeCount: 5,
    commentCount: 3,
    favoriteCount: 2,
    moderationStatus: 1,
    isLiked: false,
    isFavorited: false,
    createdAt: '2026-09-01T00:00:00Z',
    userNickname: 'Alice',
    ...overrides,
  }
}

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  return writeText
}

describe('PostContent', () => {
  beforeEach(() => {
    toastMock.mockClear()
  })

  it('should render title, content and tags', () => {
    render(<PostContent post={makePost()} />)

    expect(screen.getByRole('heading', { name: '好物分享' })).toBeInTheDocument()
    expect(screen.getByText('这是一篇正文内容')).toBeInTheDocument()
    expect(screen.getByText('#美食')).toBeInTheDocument()
    expect(screen.getByText('#旅行')).toBeInTheDocument()
  })

  it('should render interaction stats', () => {
    render(<PostContent post={makePost()} />)

    expect(screen.getByText('5 赞 · 3 评论 · 2 收藏')).toBeInTheDocument()
  })

  it('should not render product card without productName', () => {
    render(<PostContent post={makePost()} />)

    expect(screen.queryByText('复制商品信息')).toBeNull()
  })

  it('should render product card with price and source', () => {
    render(
      <PostContent post={makePost({ productName: '保温杯', productPrice: 99, productSource: '淘宝' })} />,
    )

    expect(screen.getByText('保温杯')).toBeInTheDocument()
    expect(screen.getByText('¥99 · 淘宝')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '复制商品信息' })).toBeInTheDocument()
  })

  it('should copy product info and toast success', async () => {
    stubClipboard()
    render(
      <PostContent post={makePost({ productName: '保温杯', productPrice: 99, productSource: '淘宝' })} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '复制商品信息' }))

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('success', '商品信息已复制，可在淘宝搜索')
    })
  })
})

describe('buildPostJsonLd', () => {
  it('should build structured data with images', () => {
    const post = makePost({ images: ['https://cdn/a.png', 'https://cdn/b.png'] })

    const result = buildPostJsonLd(post)

    expect(result['@context']).toBe('https://schema.org')
    expect(result.headline).toBe('好物分享')
    expect(result.author).toEqual({ '@type': 'Person', name: 'Alice' })
    expect(result.image).toEqual(post.images)
    expect(result.interactionStatistic).toHaveLength(2)
    expect(result.interactionStatistic[0].userInteractionCount).toBe(5)
    expect(result.interactionStatistic[1].userInteractionCount).toBe(3)
  })

  it('should omit image field when post has no images', () => {
    const result = buildPostJsonLd(makePost())

    expect('image' in result).toBe(false)
  })

  it('should truncate article body to 200 chars', () => {
    const result = buildPostJsonLd(makePost({ content: 'x'.repeat(300) }))

    expect(result.articleBody).toHaveLength(200)
  })
})
