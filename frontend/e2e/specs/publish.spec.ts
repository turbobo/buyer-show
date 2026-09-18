import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const FIXTURE_IMAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'test-image.png')

/**
 * 发布 → 详情可见 → 个人主页删除的完整闭环（内容中性无敏感词，直接发布）。
 */
test('发布帖子 → 详情页可见 → 个人主页删除', async ({ page }) => {
  const title = `E2E 测试帖 ${Date.now().toString(36)}`

  // 1. 发布：上传图片 + 标题 + 正文
  await page.goto('/publish')
  await page.locator('input[type="file"]').setInputFiles(FIXTURE_IMAGE)
  await page.getByRole('textbox', { name: '标题' }).fill(title)
  await page.getByRole('textbox', { name: '正文' }).fill('E2E 自动化测试内容：验证发布、展示与删除完整旅程，测试完成后自动删除。')
  await page.getByRole('button', { name: '发布', exact: true }).click()

  // 2. 发布成功 → 1.2s 后跳转详情页，标题可见
  await expect(page).toHaveURL(/\/posts\/\d+$/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: title })).toBeVisible()

  // 3. 个人主页：帖子 Tab（默认）最新帖即刚发布内容
  await page.goto('/profile')
  await expect(page.getByText(title, { exact: true })).toBeVisible()

  // 4. 删除（最新帖的删除按钮）→ 二次确认 → 列表移除
  await page.getByRole('button', { name: '删除帖子' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: '删除' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByText(title, { exact: true })).toBeHidden()
})
