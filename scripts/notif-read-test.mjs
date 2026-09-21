// 已读链路冒烟：注册 A/B → A 发帖 → B 点赞 → A 未读=1 → 单条已读 → 未读=0 → 越权幂等 → B 关注 A → 未读=1 → 全部已读 → 0
const BASE = 'http://localhost:8080/api/v1'
let seq = Date.now() % 100000

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

async function redisGet(key) {
  const { execSync } = await import('node:child_process')
  const out = execSync(`docker compose exec -T redis redis-cli --raw GET ${key}`, { cwd: new URL('..', import.meta.url).pathname }).toString().trim()
  return out
}

async function register(username) {
  const captcha = (await api('/auth/captcha')).data ?? {}
  const captchaId = captcha.captchaId
  let code = await redisGet(`captcha:${captchaId}`)
  try { code = JSON.parse(code) } catch { /* 原样使用 */ }
  const res = await api('/auth/register', { method: 'POST', body: { username: `${username}_${seq}`, password: 'test123456', nickname: `${username}${seq}`, captchaId, captchaCode: code } })
  if (res.code !== 0) throw new Error(`register ${username} failed: ${JSON.stringify(res)}`)
  const me = await api('/users/me', { token: res.data.accessToken })
  return { token: res.data.accessToken, id: me.data.id }
}

async function uploadImage(token) {
  const { execSync } = await import('node:child_process')
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notif-'))
  const png = path.join(dir, 'px.png')
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  fs.writeFileSync(png, Buffer.from(base64, 'base64'))
  const out = execSync(`curl -s -X POST ${BASE}/upload/image -H "Authorization: Bearer ${token}" -F "file=@${png}"`).toString()
  try { return JSON.parse(out).data.objectName } catch { return null }
}

const A = await register('nra')
const B = await register('nrb')
console.log('A,B registered:', A.id, B.id)

// A 发帖（带图片）
const imageName = await uploadImage(A.token)
const post = await api('/posts', { method: 'POST', token: A.token, body: { title: `已读测试帖 ${seq}`, content: '用于已读链路冒烟测试的正文内容。', images: imageName ? [imageName] : [], tags: [], rating: 5, productName: '', productPrice: '', productSource: '' } })
if (post.code !== 0) throw new Error('post failed: ' + JSON.stringify(post))
const postId = post.data.id

// B 点赞 → A 收到通知
const like = await api(`/posts/${postId}/like`, { method: 'POST', token: B.token })
if (like.code !== 0) throw new Error('like failed: ' + JSON.stringify(like))
await new Promise(r => setTimeout(r, 800))

let unread = await api('/notifications/unread-count', { token: A.token })
console.log('CHECK1 after-like unread =', unread.data.count, '(expect 1)')

const list = await api('/notifications?limit=10', { token: A.token })
const notifId = list.data[0]?.id
console.log('notification id =', notifId, 'isRead =', list.data[0]?.isRead)

// 单条已读
const mr = await api(`/notifications/${notifId}/read`, { method: 'POST', token: A.token })
console.log('markRead code =', mr.code)
unread = await api('/notifications/unread-count', { token: A.token })
console.log('CHECK2 after-markRead unread =', unread.data.count, '(expect 0)')

// 越权防护：B 标记 A 的通知已读（应不影响——受影响行 0）
const hijack = await api(`/notifications/${notifId}/read`, { method: 'POST', token: B.token })
console.log('hijack attempt code =', hijack.code, '(expect 0, 幂等无副作用)')
unread = await api('/notifications/unread-count', { token: A.token })
console.log('CHECK3 after-hijack A unread =', unread.data.count, '(expect 0)')

// B 关注 A → 新通知
const follow = await api(`/users/${A.id}/follow`, { method: 'POST', token: B.token })
if (follow.code !== 0) throw new Error('follow failed: ' + JSON.stringify(follow))
await new Promise(r => setTimeout(r, 800))
unread = await api('/notifications/unread-count', { token: A.token })
console.log('CHECK4 after-follow unread =', unread.data.count, '(expect 1)')

// 全部已读
await api('/notifications/mark-all-read', { method: 'POST', token: A.token })
unread = await api('/notifications/unread-count', { token: A.token })
console.log('CHECK5 after-markAll unread =', unread.data.count, '(expect 0)')

// 清理：删帖 + 注销 A B
await api(`/posts/${postId}`, { method: 'DELETE', token: A.token })
await api('/users/me', { method: 'DELETE', token: A.token })
await api('/users/me', { method: 'DELETE', token: B.token })
console.log('cleanup done')
