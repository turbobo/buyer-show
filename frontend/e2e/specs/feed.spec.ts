import { expect, test } from '@playwright/test'

/**
 * Feed 瀑布流加载与详情浮层（U23）开关旅程。
 */
test('Feed 加载帖子并打开/关闭详情浮层', async ({ page }) => {
  await page.goto('/')
  // 瀑布流帖子卡片渲染（post-card 根元素为 button.group）
  const firstCard = page.locator('main button.group').first()
  await expect(firstCard).toBeVisible({ timeout: 15_000 })

  // 点击卡片 → 详情浮层（state.modal）打开，评论输入框可见说明详情内容渲染完成
  await firstCard.click()
  await expect(page.getByRole('textbox', { name: '评论内容' })).toBeVisible()

  // 「返回上一页」关闭浮层 → 回到列表
  await page.getByRole('button', { name: '返回上一页' }).click()
  await expect(page.locator('main button.group').first()).toBeVisible()
})
