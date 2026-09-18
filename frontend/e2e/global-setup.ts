import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * E2E 全局 setup：注册唯一测试账号并保存登录态。
 *
 * 注册必验图形验证码 → 从 Redis 读取验证码明文（dev 环境专享：
 * CaptchaService 将 code 以 JSON 字符串存于 `captcha:{captchaId}`）。
 * 不侵入生产代码，仅在本地 dev 栈可用。
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1'
const BASE_URL = 'http://localhost:5273'
const E2E_DIR = path.dirname(fileURLToPath(import.meta.url))
// 仓库根（buyer-show/），docker compose 文件所在目录
const REPO_ROOT = path.resolve(E2E_DIR, '../..')

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

async function api<T>(pathname: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${pathname}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json()) as ApiResponse<T>
  if (json.code !== 0) {
    throw new Error(`API ${pathname} 失败: [${json.code}] ${json.message}`)
  }
  return json.data
}

/** 从 Redis 读取验证码明文（JSON 字符串 `"ABCD"`，去引号）。 */
function readCaptchaFromRedis(captchaId: string): string {
  const raw = execFileSync(
    'docker',
    ['compose', 'exec', '-T', 'redis', 'redis-cli', 'GET', `captcha:${captchaId}`],
    { cwd: REPO_ROOT, encoding: 'utf8', timeout: 10_000 },
  ).trim()
  const code = raw.replace(/^"|"$/g, '')
  if (!/^[0-9A-Z]{4}$/i.test(code)) {
    throw new Error(`验证码解析失败（Redis 返回: ${raw || '(空)'}），请确认 dev 栈已启动`)
  }
  return code
}

export default async function globalSetup(): Promise<void> {
  const username = `e2e${Date.now().toString(36)}`
  const password = 'E2eTest@2026'

  // 1. 取图形验证码 → Redis 明文
  const { captchaId } = await api<{ captchaId: string }>('/auth/captcha')
  const captchaCode = readCaptchaFromRedis(captchaId)

  // 2. 注册唯一测试账号（注册成功即返回 token）
  const tokens = await api<{ accessToken: string; refreshToken: string }>('/auth/register', {
    username,
    password,
    nickname: `E2E机器人${username.slice(-4)}`,
    captchaId,
    captchaCode,
  })

  // 3. 保存登录态与账号凭据（spec 通过 localStorage token 复用登录态）
  const authDir = path.join(E2E_DIR, '.auth')
  mkdirSync(authDir, { recursive: true })
  writeFileSync(
    path.join(authDir, 'storage.json'),
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            { name: 'buyer-show.access-token', value: tokens.accessToken },
            { name: 'buyer-show.refresh-token', value: tokens.refreshToken },
          ],
        },
      ],
    }),
  )
  writeFileSync(path.join(authDir, 'account.json'), JSON.stringify({ username, password }))
  console.log(`[E2E] 测试账号已创建: ${username}`)
}
