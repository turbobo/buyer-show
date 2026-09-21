#!/usr/bin/env node
/**
 * 买家说 · G12 电商闭环冒烟测试（商品购买链接 + 白名单域名校验）
 *
 * 用法（需本地 Docker 全栈运行中）：
 *     node scripts/g12-smoke.mjs
 * 可选环境变量：
 *     SMOKE_API_BASE   默认 http://localhost:8080/api/v1
 *
 * 覆盖：发布带合法链接（天猫/京东/拼多多）/ 非法域名拒绝（8008）/
 *      前缀与尾随欺骗拒绝 / 非 http(s) scheme 拒绝 / 编辑改链接 / 详情与 Feed 返回 productLink
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
  const dir = mkdtempSync(join(tmpdir(), 'g12-'))
  const png = join(dir, 'px.png')
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  writeFileSync(png, Buffer.from(base64, 'base64'))
  const out = execFileSync('curl', ['-s', '-X', 'POST', `${API}/upload/image`,
    '-H', `Authorization: Bearer ${token}`, '-F', `file=@${png}`], { encoding: 'utf8' })
  try { return JSON.parse(out).data.objectName } catch { return null }
}

let POST_SEQ = 0

async function createPost(token, productLink) {
  POST_SEQ += 1
  const imageName = await uploadImage(token)
  const body = {
    title: `G12 冒烟帖 ${STAMP}-${POST_SEQ} ${productLink !== undefined ? '有链接' : '无链接'}`,
    content: `用于电商闭环冒烟测试的商品分享内容，序号 ${POST_SEQ}。`,
    images: imageName ? [imageName] : [],
    tags: [],
  }
  if (productLink !== undefined) {
    body.productName = '冒烟保温杯'
    body.productPrice = 99.9
    body.productSource = '天猫'
    body.productLink = productLink
  }
  return req('/posts', token, body, 'POST')
}

async function main() {
  // ─── 账号准备 ───
  const user = await register(`g12a${STAMP}`, `冒烟G12-${STAMP}`)
  const token = user.data?.accessToken
  check('用户注册', user.code === 0 && Boolean(token), user.code)
  if (!token) {
    console.log('前置账号准备失败，终止')
    process.exit(1)
  }

  // ─── 无商品信息发帖（回归基线） ───
  const plain = await createPost(token, undefined)
  const plainId = plain.data?.id
  check('无商品信息发帖正常（回归）', plain.code === 0 && Boolean(plainId), plain.code)

  // ─── 合法链接：天猫 ───
  const tmall = await createPost(token, 'https://detail.tmall.com/item.htm?id=123456')
  const tmallId = tmall.data?.id
  check('发布带天猫链接成功', tmall.code === 0 && Boolean(tmallId), tmall.code)
  const tmallDetail = await req(`/posts/${tmallId}`)
  check('详情返回天猫 productLink', tmallDetail.data?.productLink === 'https://detail.tmall.com/item.htm?id=123456',
    tmallDetail.data?.productLink)

  // ─── 合法链接：京东 / 拼多多 ───
  const jd = await createPost(token, 'https://item.jd.com/100012043978.html')
  check('发布带京东链接成功', jd.code === 0 && Boolean(jd.data?.id), jd.code)
  const pdd = await createPost(token, 'https://mobile.yangkeduo.com/goods.html?goods_id=1')
  check('发布带拼多多链接成功', pdd.code === 0 && Boolean(pdd.data?.id), pdd.code)

  // ─── 非法链接拒绝 ───
  const evil = await createPost(token, 'https://evil.com/phishing')
  check('非白名单域名被拒（8008）', evil.code === 8008, evil.code)

  const prefixSpoof = await createPost(token, 'https://nottaobao.com/x')
  check('前缀欺骗域名被拒（8008）', prefixSpoof.code === 8008, prefixSpoof.code)

  const suffixSpoof = await createPost(token, 'https://taobao.com.evil.com/x')
  check('尾随欺骗域名被拒（8008）', suffixSpoof.code === 8008, suffixSpoof.code)

  const jsScheme = await createPost(token, 'javascript:alert(1)')
  check('非 http(s) scheme 被拒（8008）', jsScheme.code === 8008, jsScheme.code)

  const noScheme = await createPost(token, 'taobao.com/x')
  check('无 scheme 链接被拒（8008）', noScheme.code === 8008, noScheme.code)

  // ─── 编辑改链接 ───
  const originalImages = tmallDetail.data?.images ?? []
  const editResult = await req(`/posts/${tmallId}`, token, {
    title: `G12 冒烟帖 ${STAMP} 编辑后`,
    content: '编辑后的商品分享内容，字数足够继续冒烟。',
    images: originalImages,
    tags: [],
    productName: '冒烟保温杯',
    productPrice: 88,
    productSource: '京东',
    productLink: 'https://item.jd.com/100012043978.html',
  }, 'PUT')
  check('编辑改京东链接成功', editResult.code === 0, editResult.code)
  const editDetail = await req(`/posts/${tmallId}`)
  check('编辑后详情返回京东 productLink', editDetail.data?.productLink === 'https://item.jd.com/100012043978.html',
    editDetail.data?.productLink)

  const editEvil = await req(`/posts/${tmallId}`, token, {
    title: `G12 冒烟帖 ${STAMP} 编辑后`,
    content: '编辑后的商品分享内容，字数足够继续冒烟。',
    images: originalImages,
    tags: [],
    productName: '冒烟保温杯',
    productLink: 'https://evil.com/x',
  }, 'PUT')
  check('编辑非法链接被拒（8008）', editEvil.code === 8008, editEvil.code)

  // ─── Feed 返回 productLink ───
  const feed = await req('/posts?limit=20')
  const feedItem = feed.data?.list?.find((item) => item.id === tmallId)
  check('Feed 列表返回 productLink', feedItem?.productLink === 'https://item.jd.com/100012043978.html',
    feedItem?.productLink)

  // ─── 清理：删除冒烟帖 ───
  const cleanup = await req(`/posts/${tmallId}`, token, null, 'DELETE')
  check('清理冒烟帖', cleanup.code === 0, cleanup.code)
  await req(`/posts/${jd.data?.id}`, token, null, 'DELETE')
  await req(`/posts/${pdd.data?.id}`, token, null, 'DELETE')
  await req(`/posts/${plainId}`, token, null, 'DELETE')

  const failed = RESULTS.filter(([, ok]) => !ok)
  console.log(`\n结果：${RESULTS.length - failed.length}/${RESULTS.length} 通过`)
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('冒烟脚本异常:', error)
  process.exit(1)
})
