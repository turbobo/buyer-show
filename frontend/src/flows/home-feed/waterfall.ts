import { useEffect, useState } from 'react'
import type { ApiPostSummary } from '@/services/posts'

/** 根据 post id 生成确定性的图片区比例（同时给出 CSS 类与数值比，供列高估算） */
function cardImageAspect(postId: number): { className: string; ratio: number } {
  const seed = ((postId * 2654435761) >>> 0) % 100
  if (seed < 30) return { className: 'aspect-[3/4]', ratio: 4 / 3 }      // 30% 高卡
  if (seed < 60) return { className: 'aspect-square', ratio: 1 }          // 30% 方卡
  if (seed < 85) return { className: 'aspect-[4/5]', ratio: 5 / 4 }      // 25% 中高卡
  return { className: 'aspect-[5/6]', ratio: 6 / 5 }                      // 15% 矮卡
}

/** 卡片图片区 CSS 类（瀑布流 PostCard 使用） */
export function cardImageClass(postId: number): string {
  return cardImageAspect(postId).className
}

/** 估算卡片相对高度（列宽归一化为 1000），用于最短列优先分配 */
function estimateCardHeight(post: ApiPostSummary): number {
  const { ratio } = cardImageAspect(post.id)
  return ratio * 1000 + 110 + (post.productName ? 24 : 0)
}

/**
 * 按「当前最短列优先」把卡片分配到 N 列。
 * 替代 CSS columns：多列布局在卡片少/高度不均时会留下大段列尾空白。
 */
export function distributePosts(posts: ApiPostSummary[], columnCount: number): ApiPostSummary[][] {
  const columns: ApiPostSummary[][] = Array.from({ length: columnCount }, () => [])
  const heights = new Array<number>(columnCount).fill(0)
  for (const post of posts) {
    let target = 0
    for (let i = 1; i < columnCount; i++) {
      if (heights[i] < heights[target]) {
        target = i
      }
    }
    columns[target].push(post)
    heights[target] += estimateCardHeight(post)
  }
  return columns
}

/** 响应式列数（与既有断点一致：2 / md:3 / xl:4） */
export function useColumnCount(): number {
  const calc = () => {
    if (typeof window === 'undefined') return 2
    return window.innerWidth >= 768 ? 3 : 2
  }
  const [count, setCount] = useState(calc)
  useEffect(() => {
    const onResize = () => setCount(calc())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return count
}
