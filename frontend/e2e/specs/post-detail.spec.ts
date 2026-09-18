import { expect, test } from '@playwright/test'

/**
 * 详情浮层内互动旅程：发评论 + 帖子点赞。
 */
test('详情浮层内发布评论与点赞', async ({ page }) => {
  const comment = `E2E 评论 ${Date.now().toString(36)}`

  await page.goto('/')
  await page.locator('main button.group').first().click()

  // 发布评论
  const input = page.getByRole('textbox', { name: '评论内容' })
  await expect(input).toBeVisible()
  await input.fill(comment)
  await page.getByRole('button', { name: '发送评论' }).click()
  await expect(page.getByText(comment)).toBeVisible()

  // 帖子点赞（定位底部 action-bar 内的点赞按钮，避免命中评论区的同名按钮）：点击后切换为「取消点赞」
  const actionBar = page.locator('div.fixed.bottom-0')
  await actionBar.getByRole('button', { name: '点赞' }).click()
  await expect(actionBar.getByRole('button', { name: '取消点赞' })).toBeVisible()
})
