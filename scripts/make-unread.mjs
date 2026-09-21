// 制造未读通知：批次1（PC 验证用，2 条未读：点赞+关注）、批次2（移动端验证用，1 条未读：点赞）
// 输出两组账号凭据供浏览器验证使用
const BASE = 'http://localhost:8080/api/v1'
const seq = Date.now() % 100000

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

async function makeBatch(pair, { withFollow }) {
  const A = await register(pair[0])
  const B = await register(pair[1])
  const imageName = await uploadImage(A.token)
  const post = await api('/posts', { method: 'POST', token: A.token, body: { title: `红点测试帖 ${seq}`, content: '用于红点 UI 验证的正文内容。', images: imageName ? [imageName] : [], tags: [], rating: 5, productName: '', productPrice: '', productSource: '' } })
  if (post.code !== 0) throw new Error('post failed: ' + JSON.stringify(post))
  const like = await api(`/posts/${post.data.id}/like`, { method: 'POST', token: B.token })
  if (like.code !== 0) throw new Error('like failed: ' + JSON.stringify(like))
  if (withFollow) {
    const follow = await api(`/users/${A.id}/follow`, { method: 'POST', token: B.token })
    if (follow.code !== 0) throw new Error('follow failed: ' + JSON.stringify(follow))
  }
  await new Promise(r => setTimeout(r, 800))
  const unread = await api('/notifications/unread-count', { token: A.token })
  console.log(`${pair[0]} unread =`, unread.data.count)
  return { username: `${pair[0]}_${seq}`, password: 'test123456' }
}

const pc = await makeBatch(['redpc_a', 'redpc_b'], { withFollow: true })
const mobile = await makeBatch(['redm_a', 'redm_b'], { withFollow: false })
console.log('PC_CREDS=' + JSON.stringify(pc))
console.log('MOBILE_CREDS=' + JSON.stringify(mobile))
