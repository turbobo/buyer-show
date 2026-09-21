#!/usr/bin/env node
/**
 * 买家说 · 个人中心补全冒烟测试（账号注销闭环）
 *
 * 用法（需本地 Docker 全栈运行中）：
 *     node scripts/pc-smoke.mjs
 * 可选环境变量：
 *     SMOKE_API_BASE   默认 http://localhost:8080/api/v1
 *
 * 覆盖：注销前帖子公开可见 / DELETE /users/me 注销成功 /
 *      注销后旧 token 被拒（1003）/ 重新登录被拒（1006）/
 *      他人查看资料 2001 / 帖子不可见 / DB 侧 status=2 与计数清零 / 清理
 * 退出码：全部通过 0；存在失败 1（可直接接入 CI）。
 * 依赖：Node 22+（原生 fetch）。
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const API = process.env.SMOKE_API_BASE ?? 'http://localhost:8080/api/v1'
const STAMP = Math.floor(100000 + Math.random() * 900000)

const RESULTS = []

function check(name, ok, detail = '') {
  RESULTS.push([name, Boolean(ok), detail])
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? `  (${detail})` : ''}`)
}

async function req(path, token = null, body = null, method = 'GET') {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === null ? undefined : JSON.stringify(body),
  })
  let payload = null
  try { payload = await response.json() } catch { /* 非 JSON */ }
  return { http: response.status, ...payload }
}

function redisGet(key) {
  const raw = execFileSync('docker', ['compose', 'exec', '-T', 'redis', 'redis-cli', '--raw', 'GET', key], {
    encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname,
  }).trim()
  try { return JSON.parse(raw) } catch { return raw }
}

function mysqlQuery(sql) {
  return execFileSync('docker', ['compose', 'exec', '-T', 'mysql', 'mysql', '-uapp', '-pdevpassword',
    'buyershow', '-N', '-e', sql], {
    encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname,
  }).trim()
}

async function register(username, nickname) {
  const captcha = (await req('/auth/captcha')).data ?? {}
  const captchaId = captcha.captchaId
  const captchaCode = captchaId ? redisGet(`captcha:${captchaId}`) : ''
  return req('/auth/register', null, {
    username, password: '123456', nickname, captchaId, captchaCode,
  }, 'POST')
}

async function login(identifier) {
  return req('/auth/login', null, { username: identifier, password: '123456' }, 'POST')
}

async function uploadImage(token) {
  const dir = mkdtempSync(join(tmpdir(), 'pc-'))
  const png = join(dir, 'px.png')
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  writeFileSync(png, Buffer.from(base64, 'base64'))
  const out = execFileSync('curl', ['-s', '-X', 'POST', `${API}/upload/image`,
    '-H', `Authorization: Bearer ${token}`, '-F', `file=@${png}`], { encoding: 'utf8' })
  try { return JSON.parse(out).data.objectName } catch { return null }
}

async function main() {
  // ─── 账号准备：A（待注销）+ B（旁观者） ───
  const userA = await register(`pca${STAMP}`, `注销A-${STAMP}`)
  const userB = await register(`pcb${STAMP}`, `旁观B-${STAMP}`)
  const tokenA = userA.data?.accessToken
  const tokenB = userB.data?.accessToken
  check('用户注册（A+B）', Boolean(tokenA) && Boolean(tokenB), userA.code)
  if (!tokenA || !tokenB) {
    console.log('前置账号准备失败，终止')
    process.exit(1)
  }
  const meA = await req('/users/me', tokenA)
  const meB = await req('/users/me', tokenB)
  const userAId = meA.data?.id
  const userBId = meB.data?.id
  if (!userAId || !userBId) {
    console.log('获取用户 ID 失败，终止')
    process.exit(1)
  }

  // ─── A 发帖并确认公开可见 ───
  const imageName = await uploadImage(tokenA)
  const post = await req('/posts', tokenA, {
    title: `PC 注销冒烟帖 ${STAMP}`,
    content: '用于注销账号闭环冒烟测试的内容。',
    images: imageName ? [imageName] : [],
    tags: ['冒烟'],
  }, 'POST')
  const postId = post.data?.id
  const detailBefore = await req(`/posts/${postId}`, tokenB)
  check('注销前：发帖成功且公开可见', Boolean(postId) && detailBefore.code === 0 && detailBefore.data?.id === postId, post.code)

  // ─── A 注销账号 ───
  const deactivate = await req('/users/me', tokenA, null, 'DELETE')
  check('注销：DELETE /users/me 成功', deactivate.code === 0, `${deactivate.code}/${deactivate.message ?? ''}`)

  // ─── 注销后：旧 token 被拒（1003） ───
  const oldTokenMe = await req('/users/me', tokenA)
  check('注销后：旧 token 访问被拒（1003）', oldTokenMe.code === 1003, oldTokenMe.code)

  // ─── 注销后：重新登录被拒（1006） ───
  const relogin = await login(`pca${STAMP}`)
  check('注销后：重新登录被拒（1006）', relogin.code === 1006, `${relogin.code}/${relogin.message ?? ''}`)

  // ─── 注销后：他人查看资料 2001 ───
  const profile = await req(`/users/${userAId}`, tokenB)
  check('注销后：他人查看资料 2001', profile.code === 2001, profile.code)

  // ─── 注销后：帖子不可见 ───
  const detailAfter = await req(`/posts/${postId}`, tokenB)
  check('注销后：帖子详情不可见', detailAfter.code !== 0, `${detailAfter.code}/${detailAfter.message ?? ''}`)

  // ─── DB 侧：用户 status=2、帖子 status=2、计数清零 ───
  const userStatus = mysqlQuery(`SELECT status FROM users WHERE id = ${userAId}`)
  const postStatus = mysqlQuery(`SELECT status FROM posts WHERE id = ${postId}`)
  const postCount = mysqlQuery(`SELECT post_count FROM users WHERE id = ${userAId}`)
  check('DB：用户 status=2（注销）', userStatus === '2', `got=${userStatus}`)
  check('DB：帖子 status=2（软删）', postStatus === '2', `got=${postStatus}`)
  check('DB：post_count 清零', postCount === '0', `got=${postCount}`)

  // ─── 清理：删除冒烟用户与帖子（软删数据无法通过 API 删除，直接 DB 清理） ───
  mysqlQuery(`DELETE FROM posts WHERE id = ${postId}`)
  mysqlQuery(`DELETE FROM users WHERE id IN (${userAId}, ${userBId})`)
  check('清理冒烟数据', true, '')

  const failed = RESULTS.filter(([, ok]) => !ok)
  console.log(`\n结果：${RESULTS.length - failed.length}/${RESULTS.length} 通过`)
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('冒烟脚本异常:', error)
  process.exit(1)
})
