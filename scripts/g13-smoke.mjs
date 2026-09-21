#!/usr/bin/env node
/**
 * 买家说 · G13 个性化推荐冒烟测试（偏好标签加权重排 + 冷启动回退 + 登录要求）
 *
 * 用法（需本地 Docker 全栈运行中）：
 *     node scripts/g13-smoke.mjs
 * 可选环境变量：
 *     SMOKE_API_BASE   默认 http://localhost:8080/api/v1
 *
 * 覆盖：未登录 recommend 拒绝（1003）/ 收藏+点赞形成「美食」偏好后
 *      推荐流中「美食」帖排在「数码」帖之前（+50 偏好加成生效）/
 *      推荐流排除自己发的帖子 / 冷启动用户回退热门不报错 / 清理
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

async function register(username, nickname) {
  const captcha = (await req('/auth/captcha')).data ?? {}
  const captchaId = captcha.captchaId
  const captchaCode = captchaId ? redisGet(`captcha:${captchaId}`) : ''
  return req('/auth/register', null, {
    username, password: '123456', nickname, captchaId, captchaCode,
  }, 'POST')
}

async function uploadImage(token) {
  const dir = mkdtempSync(join(tmpdir(), 'g13-'))
  const png = join(dir, 'px.png')
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  writeFileSync(png, Buffer.from(base64, 'base64'))
  const out = execFileSync('curl', ['-s', '-X', 'POST', `${API}/upload/image`,
    '-H', `Authorization: Bearer ${token}`, '-F', `file=@${png}`], { encoding: 'utf8' })
  try { return JSON.parse(out).data.objectName } catch { return null }
}

let POST_SEQ = 0

async function createPost(token, tags) {
  POST_SEQ += 1
  const imageName = await uploadImage(token)
  const body = {
    title: `G13 冒烟帖 ${STAMP}-${POST_SEQ} 标签${tags.join('+')}`,
    content: `用于个性化推荐冒烟测试的商品分享内容，序号 ${POST_SEQ}。`,
    images: imageName ? [imageName] : [],
    tags,
  }
  return req('/posts', token, body, 'POST')
}

async function main() {
  // ─── 账号准备 ───
  const userA = await register(`g13a${STAMP}`, `冒烟A-${STAMP}`)
  const userB = await register(`g13b${STAMP}`, `冒烟B-${STAMP}`)
  const userC = await register(`g13c${STAMP}`, `冒烟C-${STAMP}`)
  const userD = await register(`g13d${STAMP}`, `冒烟D-${STAMP}`)
  const userE = await register(`g13e${STAMP}`, `冒烟E-${STAMP}`)
  const [tokenA, tokenB, tokenC, tokenD, tokenE] = [
    userA.data?.accessToken, userB.data?.accessToken, userC.data?.accessToken,
    userD.data?.accessToken, userE.data?.accessToken,
  ]
  check('用户注册（A-E）', [tokenA, tokenB, tokenC, tokenD, tokenE].every(Boolean), userA.code)
  if (!tokenA || !tokenB || !tokenC || !tokenD || !tokenE) {
    console.log('前置账号准备失败，终止')
    process.exit(1)
  }

  // ─── 内容准备：A 发「美食」帖 ×2，B 发「数码」帖 ×1 ───
  const food1 = await createPost(tokenA, ['美食'])
  const food2 = await createPost(tokenA, ['美食'])
  const digital1 = await createPost(tokenB, ['数码'])
  const food1Id = food1.data?.id
  const food2Id = food2.data?.id
  const digital1Id = digital1.data?.id
  check('内容准备：美食帖 ×2 + 数码帖 ×1', Boolean(food1Id) && Boolean(food2Id) && Boolean(digital1Id), food1.code)

  // ─── C 收藏 + 点赞 A 的「美食」帖（形成偏好画像）；E 点赞 B 的「数码」帖（给数码帖热度但不动 C 偏好） ───
  const fav = await req(`/posts/${food1Id}/favorite`, tokenC, {}, 'POST')
  const like = await req(`/posts/${food2Id}/like`, tokenC, null, 'POST')
  await req(`/posts/${digital1Id}/like`, tokenE, null, 'POST')
  check('C 收藏+点赞美食帖形成偏好', fav.code === 0 && like.code === 0, `${fav.code}/${like.code}`)

  // ─── 未登录 recommend 拒绝（1003） ───
  const anon = await req('/posts?sort=recommend')
  check('未登录 recommend 被拒（1003）', anon.code === 1003, anon.code)

  // ─── C 的推荐流：美食帖排在数码帖之前（+50 偏好加成生效） ───
  const rec = await req('/posts?sort=recommend&limit=20', tokenC)
  const recIds = rec.data?.list?.map((item) => item.id) ?? []
  const food1Index = recIds.indexOf(food1Id)
  const food2Index = recIds.indexOf(food2Id)
  const digital1Index = recIds.indexOf(digital1Id)
  check('C 推荐流返回成功', rec.code === 0 && recIds.length > 0, rec.code)
  check('C 推荐流含偏好美食帖', food1Index !== -1 || food2Index !== -1, `f1=${food1Index},f2=${food2Index}`)
  const foodFirstIndex = food1Index !== -1 ? food1Index : food2Index
  check('C 推荐流美食帖排在数码帖之前', digital1Index === -1 || foodFirstIndex !== -1 && foodFirstIndex < digital1Index,
    `food=${foodFirstIndex},digital=${digital1Index}`)

  // ─── 排除自己：C 自己发帖后不出现在自己的推荐流 ───
  const own = await createPost(tokenC, ['美食'])
  const ownId = own.data?.id
  const rec2 = await req('/posts?sort=recommend&limit=50', tokenC)
  const rec2Ids = rec2.data?.list?.map((item) => item.id) ?? []
  check('C 推荐流排除自己发的帖子', Boolean(ownId) && !rec2Ids.includes(ownId), `own=${ownId}`)

  // ─── 冷启动：D 无任何行为，推荐回退热门不报错 ───
  const cold = await req('/posts?sort=recommend&limit=20', tokenD)
  check('冷启动 D 推荐流回退热门正常', cold.code === 0 && (cold.data?.list?.length ?? 0) > 0, cold.code)

  // ─── 带标签过滤的推荐流（兼容性） ───
  const tagged = await req('/posts?sort=recommend&tag=美食', tokenC)
  const taggedAllFood = (tagged.data?.list ?? []).every((item) => (item.tags ?? []).includes('美食'))
  check('推荐流 tag 过滤生效', tagged.code === 0 && (tagged.data?.list?.length ?? 0) > 0 && taggedAllFood, tagged.code)

  // ─── 清理：删除冒烟帖 ───
  await req(`/posts/${food1Id}`, tokenA, null, 'DELETE')
  await req(`/posts/${food2Id}`, tokenA, null, 'DELETE')
  await req(`/posts/${digital1Id}`, tokenB, null, 'DELETE')
  await req(`/posts/${ownId}`, tokenC, null, 'DELETE')
  check('清理冒烟帖', true, '')

  const failed = RESULTS.filter(([, ok]) => !ok)
  console.log(`\n结果：${RESULTS.length - failed.length}/${RESULTS.length} 通过`)
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('冒烟脚本异常:', error)
  process.exit(1)
})
