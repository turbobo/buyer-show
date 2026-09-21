#!/usr/bin/env node
/**
 * 买家说 · G11 实时推送冒烟测试（STOMP over WebSocket + 系统公告）
 *
 * 用法（需本地 Docker 全栈运行中）：
 *     node scripts/g11-smoke.mjs
 * 可选环境变量：
 *     SMOKE_API_BASE   默认 http://localhost:8080/api/v1
 *     SMOKE_WS_BASE    默认 ws://localhost:8080
 *     SMOKE_ADMIN_USER 默认 adm23811
 *     SMOKE_ADMIN_PASS 默认 123456
 *
 * 覆盖：STOMP 握手鉴权（无 token 拒绝）/ 通知推送（关注+点赞）/ 私信推送 /
 *      系统公告广播 / 公告 CRUD 负例 / 公开 latest 端点 / 权限边界
 * 退出码：全部通过 0；存在失败 1（可直接接入 CI）。
 * 依赖：Node 22+（原生 fetch + WebSocket）。
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const API = process.env.SMOKE_API_BASE ?? 'http://localhost:8080/api/v1'
const WS = process.env.SMOKE_WS_BASE ?? 'ws://localhost:8080'
const ADMIN_USER = process.env.SMOKE_ADMIN_USER ?? 'adm23811'
const ADMIN_PASS = process.env.SMOKE_ADMIN_PASS ?? '123456'
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

async function register(username, nickname) {
  const captcha = (await req('/auth/captcha')).data ?? {}
  const captchaId = captcha.captchaId
  const captchaCode = captchaId ? redisGet(`captcha:${captchaId}`) : ''
  return req('/auth/register', null, {
    username, password: '123456', nickname, captchaId, captchaCode,
  }, 'POST')
}

async function uploadImage(token) {
  const dir = mkdtempSync(join(tmpdir(), 'g11-'))
  const png = join(dir, 'px.png')
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  writeFileSync(png, Buffer.from(base64, 'base64'))
  const out = execFileSync('curl', ['-s', '-X', 'POST', `${API}/upload/image`,
    '-H', `Authorization: Bearer ${token}`, '-F', `file=@${png}`], { encoding: 'utf8' })
  try { return JSON.parse(out).data.objectName } catch { return null }
}

/** 手写 STOMP 客户端（CONNECT/SUBSCRIBE + 帧等待）。 */
class StompClient {
  constructor(url) {
    this.ws = new WebSocket(url)
    this.buffer = ''
    this.listeners = []
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve()
      this.ws.onerror = () => reject(new Error(`WebSocket 连接失败: ${url}`))
    })
    this.ws.onmessage = (event) => {
      this.buffer += typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString('utf8')
      while (true) {
        const idx = this.buffer.indexOf('\0')
        if (idx < 0) break
        const frame = this.buffer.slice(0, idx)
        this.buffer = this.buffer.slice(idx + 1)
        this.handleFrame(frame)
      }
    }
  }

  sendFrame(command, headers, body = '') {
    const lines = [command]
    for (const [key, value] of Object.entries(headers)) lines.push(`${key}:${value}`)
    this.ws.send(`${lines.join('\n')}\n\n${body}\0`)
  }

  handleFrame(frame) {
    const split = frame.indexOf('\n\n')
    const head = split >= 0 ? frame.slice(0, split) : frame
    const body = split >= 0 ? frame.slice(split + 2) : ''
    const lines = head.split('\n')
    const command = lines[0]
    const headers = {}
    for (const line of lines.slice(1)) {
      const i = line.indexOf(':')
      if (i > 0) headers[line.slice(0, i)] = line.slice(i + 1)
    }
    for (const listener of [...this.listeners]) {
      if (listener.predicate(command, headers, body)) {
        clearTimeout(listener.timer)
        this.listeners.splice(this.listeners.indexOf(listener), 1)
        listener.resolve({ command, headers, body })
      }
    }
  }

  waitFrame(predicate, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const entry = { predicate, resolve, timer: null }
      entry.timer = setTimeout(() => {
        this.listeners.splice(this.listeners.indexOf(entry), 1)
        reject(new Error('等待 STOMP 帧超时'))
      }, timeoutMs)
      this.listeners.push(entry)
    })
  }

  async connect(headers = {}) {
    await this.ready
    this.sendFrame('CONNECT', { 'accept-version': '1.2', host: 'localhost', ...headers })
    return this.waitFrame((command) => command === 'CONNECTED' || command === 'ERROR', 5000)
  }

  subscribe(id, destination) {
    this.sendFrame('SUBSCRIBE', { id, destination, ack: 'auto' })
  }

  close() {
    try { this.ws.close() } catch { /* 已关闭 */ }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  // ─── 账号准备 ───
  const adminLogin = await req('/auth/login', null, { username: ADMIN_USER, password: ADMIN_PASS }, 'POST')
  const adminToken = adminLogin.data?.accessToken
  check('管理员登录', adminLogin.code === 0, adminLogin.code)

  const userA = await register(`g11a${STAMP}`, `冒烟A${STAMP}`)
  const tokenA = userA.data?.accessToken
  const idA = userA.data?.userId
  check('用户 A 注册', userA.code === 0 && Boolean(idA), JSON.stringify({ http: userA.http, code: userA.code, message: userA.message }))

  const userB = await register(`g11b${STAMP}`, `冒烟B${STAMP}`)
  const tokenB = userB.data?.accessToken
  const idB = userB.data?.userId
  check('用户 B 注册', userB.code === 0 && Boolean(idB), JSON.stringify({ http: userB.http, code: userB.code, message: userB.message }))

  if (!adminToken || !tokenA || !tokenB) {
    console.log('前置账号准备失败，终止')
    process.exit(1)
  }

  // ─── STOMP 握手鉴权 ───
  const badClient = new StompClient(`${WS}/ws`)
  const badResult = await badClient.connect()
  check('无 token CONNECT 被拒（ERROR 帧）', badResult.command === 'ERROR', badResult.command)
  badClient.close()

  // ─── 连接与订阅 ───
  const clientA = new StompClient(`${WS}/ws`)
  const connectedA = await clientA.connect({ Authorization: `Bearer ${tokenA}` })
  check('用户 A STOMP 连接成功', connectedA.command === 'CONNECTED', connectedA.command)
  clientA.subscribe('sub-n', '/user/queue/notifications')
  clientA.subscribe('sub-m', '/user/queue/messages')
  clientA.subscribe('sub-a', '/topic/announcements')

  const clientB = new StompClient(`${WS}/ws`)
  const connectedB = await clientB.connect({ Authorization: `Bearer ${tokenB}` })
  check('用户 B STOMP 连接成功', connectedB.command === 'CONNECTED', connectedB.command)
  clientB.subscribe('sub-m', '/user/queue/messages')

  await sleep(300) // 等订阅在 broker 生效

  // ─── 通知推送：B 关注 A ───
  const notificationPromiseA = clientA.waitFrame(
    (command, headers, body) => command === 'MESSAGE' && headers.destination?.includes('notifications'))
  const followResult = await req(`/users/${idA}/follow`, tokenB, {}, 'POST')
  check('B 关注 A 成功', followResult.code === 0, followResult.code)
  const notifFrame1 = await notificationPromiseA
  const notifPayload1 = JSON.parse(notifFrame1.body)
  check('A 实时收到 follow 通知推送', notifPayload1?.type === 'notification.created'
    && notifPayload1?.userId === idA && Boolean(notifPayload1?.notificationId),
    JSON.stringify(notifPayload1))

  // ─── A 发帖 → B 点赞 → 通知推送 ───
  const imageName = await uploadImage(tokenA)
  const postResult = await req('/posts', tokenA, {
    title: `G11 冒烟帖 ${STAMP}`, content: '用于实时推送冒烟测试的内容', images: imageName ? [imageName] : [], tags: [],
  }, 'POST')
  const postId = postResult.data?.id
  check('A 发帖成功', postResult.code === 0 && Boolean(postId), postResult.code)

  const notificationPromiseA2 = clientA.waitFrame(
    (command, headers) => command === 'MESSAGE' && headers.destination?.includes('notifications'))
  const likeResult = await req(`/posts/${postId}/like`, tokenB, {}, 'POST')
  check('B 点赞 A 帖子成功', likeResult.code === 0, likeResult.code)
  const notifFrame2 = await notificationPromiseA2
  const notifPayload2 = JSON.parse(notifFrame2.body)
  check('A 实时收到 like 通知推送', notifPayload2?.type === 'notification.created'
    && Boolean(notifPayload2?.notificationId), JSON.stringify(notifPayload2))

  // ─── 私信推送：A 给 B 发私信（B 已关注 A，A 可发起） ───
  const messagePromiseB = clientB.waitFrame(
    (command, headers) => command === 'MESSAGE' && headers.destination?.includes('messages'))
  const convResult = await req('/conversations', tokenA, { targetUserId: idB }, 'POST')
  const convId = convResult.data?.id
  check('A 发起会话成功', convResult.code === 0 && Boolean(convId), convResult.code)
  const sendResult = await req(`/conversations/${convId}/messages`, tokenA, { content: 'G11 实时私信冒烟' }, 'POST')
  check('A 发送私信成功', sendResult.code === 0, sendResult.code)
  const messageFrame = await messagePromiseB
  const messagePayload = JSON.parse(messageFrame.body)
  check('B 实时收到私信推送', messagePayload?.conversationId === convId
    && messagePayload?.content === 'G11 实时私信冒烟', JSON.stringify(messagePayload))

  // ─── 系统公告：管理员发布 → 广播 ───
  const announcementPromiseA = clientA.waitFrame(
    (command, headers) => command === 'MESSAGE' && headers.destination?.includes('announcements'))
  const createAnn = await req('/admin/announcements', adminToken, {
    title: `G11 公告 ${STAMP}`, content: '系统维护通知：今晚 23:00-24:00 短暂停机。', status: 1,
  }, 'POST')
  const annId = createAnn.data?.id
  check('管理员创建已发布公告成功', createAnn.code === 0 && Boolean(annId), createAnn.code)
  const annFrame = await announcementPromiseA
  const annPayload = JSON.parse(annFrame.body)
  check('A 实时收到公告广播', annPayload?.id === annId && annPayload?.title?.includes(String(STAMP)),
    JSON.stringify(annPayload))

  // ─── 公开 latest 端点 ───
  const latest = await req('/announcements/latest')
  check('公开端 latest 返回公告（无需登录）', latest.code === 0 && latest.data?.id === annId, latest.code)

  // ─── 公告 CRUD 负例 ───
  const blankTitle = await req('/admin/announcements', adminToken, { title: ' ', content: 'x', status: 1 }, 'POST')
  check('空标题公告被拒', blankTitle.http === 400 || blankTitle.code === 6001, `${blankTitle.http}/${blankTitle.code}`)
  const badStatus = await req('/admin/announcements', adminToken, { title: 'x', content: 'x', status: 2 }, 'POST')
  check('创建 status=2 被拒（8007）', badStatus.code === 8007, badStatus.code)
  const notFound = await req('/admin/announcements/999999', adminToken, { title: 'x', content: 'x', status: 1 }, 'PUT')
  check('更新不存在公告被拒（8006）', notFound.code === 8006, notFound.code)
  const forbidden = await req('/admin/announcements', tokenA, { title: 'x', content: 'x', status: 0 }, 'POST')
  check('普通用户创建公告 403', forbidden.http === 403 || forbidden.code === 1004, `${forbidden.http}/${forbidden.code}`)

  // ─── 清理 ───
  const offline = await req(`/admin/announcements/${annId}/offline`, adminToken, {}, 'PUT')
  check('公告下线成功', offline.code === 0, offline.code)
  const deleted = await req(`/admin/announcements/${annId}`, adminToken, null, 'DELETE')
  check('公告删除成功', deleted.code === 0, deleted.code)
  const latestAfter = await req('/announcements/latest')
  check('删除后 latest 无公告', latestAfter.code === 0 && latestAfter.data == null,
    JSON.stringify(latestAfter.data))

  clientA.close()
  clientB.close()

  const failed = RESULTS.filter(([, ok]) => !ok)
  console.log(`\n结果：${RESULTS.length - failed.length}/${RESULTS.length} 通过`)
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('冒烟脚本异常:', error)
  process.exit(1)
})
