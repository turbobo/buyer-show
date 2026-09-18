import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const ACCOUNT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.auth', 'account.json')

/**
 * 登出 → 重新登录旅程。
 * 全局 setup 已注入登录态；本 spec 显式登出后验证登录页闭环。
 * 注：storageState 每个测试独立加载，本 spec 的登出不污染其他 spec。
 */
test('登出后可用测试账号重新登录', async ({ page }) => {
  const { username, password } = JSON.parse(readFileSync(ACCOUNT_PATH, 'utf8')) as {
    username: string
    password: string
  }

  await page.goto('/')
  // 打开账号菜单 → 退出登录 → 二次确认（ConfirmDialog 内「退出登录」）
  await page.getByRole('button', { name: '账号菜单' }).click()
  await page.getByRole('menuitem', { name: '退出登录' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '退出登录' }).click()

  // 登出后回到游客态：Header 显示「登录」入口（等确认弹窗关闭动画结束，避免残留按钮干扰）
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()

  // 重新登录（首登正确密码不触发验证码）
  await page.goto('/login')
  await page.getByRole('textbox', { name: '账号' }).fill(username)
  await page.getByRole('textbox', { name: '密码' }).fill(password)
  await page.getByRole('button', { name: '登录', exact: true }).click()

  // 登录成功 → 回到首页 → 账号菜单再次出现
  await expect(page.getByRole('button', { name: '账号菜单' })).toBeVisible()
})
