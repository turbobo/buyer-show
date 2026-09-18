import { expect, test } from '@playwright/test'

/**
 * 搜索页旅程：热门推荐默认渲染 + 关键词检索结果区出现。
 */
test('搜索页热门推荐与关键词检索', async ({ page }) => {
  await page.goto('/search')

  // 默认态：搜索框与热门搜索推荐区渲染
  const input = page.getByRole('textbox', { name: '搜索关键词' }).first()
  await expect(input).toBeVisible()
  await expect(page.getByText('热门搜索')).toBeVisible()

  // 输入关键词回车 → 结果区渲染（有结果计数或空态，均证明检索链路通）
  await input.fill('买家说')
  await input.press('Enter')
  await expect(page.getByText(/找到 \d+ 条相关分享|没有找到与「买家说」相关的内容/)).toBeVisible()
})
