#!/usr/bin/env node
/**
 * 首屏 bundle 体积门禁（P4.5）：
 * 统计 index.html 静态引用的 JS + 首页 feed 路由 chunk 的 gzip 体积，
 * 超过阈值（默认 150KB，对齐架构目标「首屏 JS gzip < 150KB」）时退出码 1。
 * CSS 单独统计展示（不计入门禁，与架构目标口径一致）。
 * 用法：npm run size:check（内部先执行 build）；可视化分析用 npm run build:report。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const LIMIT_KB = 150

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/index.html 不存在，请先执行 npm run build')
  process.exit(1)
}

const html = readFileSync(path.join(DIST, 'index.html'), 'utf8')
const assets = new Set()
for (const match of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)) {
  assets.add(match[1].replace(/^\//, ''))
}
// 首页 feed 是初始路由立即渲染的 chunk（lazy 但首屏必经），一并计入
const feedChunk = readdirSync(path.join(DIST, 'assets')).find((name) => /^feed-.*\.js$/.test(name))
if (feedChunk) assets.add(`assets/${feedChunk}`)

let totalJs = 0
let totalCss = 0
for (const rel of [...assets].sort()) {
  const file = path.join(DIST, rel)
  if (!existsSync(file)) {
    console.error(`引用文件缺失：${rel}`)
    process.exit(1)
  }
  const gzipBytes = gzipSync(readFileSync(file)).length
  const isCss = rel.endsWith('.css')
  if (isCss) totalCss += gzipBytes
  else totalJs += gzipBytes
  console.log(`  ${(gzipBytes / 1024).toFixed(2).padStart(8)} kB  ${rel}${isCss ? ' (css)' : ''}`)
}

const totalKB = totalJs / 1024
console.log(`首屏 JS gzip 合计: ${totalKB.toFixed(2)} kB（阈值 ${LIMIT_KB} kB）｜ CSS: ${(totalCss / 1024).toFixed(2)} kB（参考）`)
if (totalKB > LIMIT_KB) {
  console.error('✗ 超出体积门禁，请先做 bundle 瘦身（npm run build:report 可视化分析）')
  process.exit(1)
}
console.log('✓ 体积门禁通过')
