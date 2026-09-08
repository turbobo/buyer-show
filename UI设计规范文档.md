## 买家说 — UI 设计规范文档

> 本文档定义项目全局设计决策，所有页面和组件开发必须遵循。
> 参考基准：小红书、Instagram、Pinterest、什么值得买
>
> **注意**：色值（#FF6B35 等）为设计权威来源。Tailwind 类名在 v3.4 → v4 迁移中可能有差异，
> 当前前端使用 Tailwind CSS 4 + `@theme` Token 注册自定义色（coral、warm-bg 等），以代码实际注册为准。

---

### 一、设计系统 Design Tokens

#### 1.1 色彩体系

| 用途 | 色值 | Tailwind 类 | 说明 |
|------|------|-------------|------|
| 品牌主色 | `#FF6B35` | `coral-500` | CTA 按钮、选中态、强调 |
| 主色浅 | `#FF8A5C` | `coral-400` | 渐变终点 |
| 主色深 | `#E85A24` | `coral-600` | 按压态、hover 加深 |
| 主色极浅 | `#FFF5F0` | `coral-50` | 标签背景、选中底色 |
| 页面背景 | `#FAF7F5` | `warm-50` | 全局底色 |
| 卡片背景 | `#FFFFFF` | `white` | 卡片、弹窗 |
| 正文色 | `#1F2937` | `gray-800` | 标题、主文本 |
| 辅助色 | `#6B7280` | `gray-500` | 副标题、描述 |
| 占位色 | `#D1D5DB` | `gray-300` | 输入框 placeholder |
| 分割线 | `#F3F4F6` | `gray-100` | 边框、分割 |
| 成功 | `#10B981` | `emerald-500` | 发布成功、操作成功 |
| 警告 | `#F59E0B` | `amber-500` | 评分星级 |
| 错误 | `#EF4444` | `red-500` | 表单校验、网络错误 |
| 点赞红 | `#EF4444` | `red-500` | 已点赞心跳色 |

#### 1.2 字体层级

| 层级 | 字号 | 行高 | 字重 | 用途 |
|------|------|------|------|------|
| H1 | 20px | 28px | 700 | 页面标题、详情页标题 |
| H2 | 16px | 24px | 700 | 卡片标题、区块标题 |
| Body | 14px | 22px | 400 | 正文内容、评论 |
| Caption | 12px | 18px | 400 | 时间、辅助说明 |
| Tiny | 10px | 14px | 500 | 标签文字、TabBar 文字 |

- 字体栈：`-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`
- 数字字体：`DIN Alternate, Avenir Next`（价格、统计数字）

#### 1.3 间距系统

基准单位 **4px**，所有间距为 4 的倍数：

| Token | 值 | Tailwind | 用途 |
|-------|-----|----------|------|
| xs | 4px | `p-1` | 图标与文字间距 |
| sm | 8px | `p-2` / `gap-2` | 紧凑元素间距 |
| md | 12px | `p-3` / `gap-3` | 卡片内间距、列表间距 |
| lg | 16px | `p-4` / `gap-4` | 区块间距 |
| xl | 20px | `p-5` | 页面边距 |
| 2xl | 24px | `p-6` | 大区块间距 |
| 3xl | 32px | `p-8` | 桌面端页面边距 |

#### 1.4 圆角

| Token | 值 | 用途 |
|-------|-----|------|
| sm | 8px | 输入框、小标签 |
| md | 12px | 按钮、小卡片 |
| lg | 16px | 帖子卡片、内容卡片 |
| xl | 24px | 弹窗、底部 Sheet |
| full | 9999px | 头像、胶囊按钮、标签 |

#### 1.5 阴影层级

| 层级 | 值 | 用途 |
|------|-----|------|
| shadow-sm | `0 1px 3px rgba(0,0,0,0.06)` | 卡片默认 |
| shadow-md | `0 4px 12px rgba(0,0,0,0.08)` | 悬浮按钮、导航栏 |
| shadow-lg | `0 8px 24px rgba(0,0,0,0.12)` | 弹窗、下拉菜单 |
| shadow-coral | `0 4px 12px rgba(255,107,53,0.25)` | 主色按钮 |

---

### 二、导航架构

#### 2.1 页面层级

```
Tab 页面（一级）
├── /              发现（首页）
├── /search        搜索
├── /publish       发布
└── /profile       个人中心

二级页面（从 Tab 页跳转）
├── /post/[id]     帖子详情
├── /user/[id]     他人主页
└── /settings      设置页
```

#### 2.2 导航栏规则

| 场景 | 移动端 | PC 端 |
|------|--------|-------|
| Tab 页面 | 底部 TabBar（4 tab + 发布凸起按钮） | 顶部导航栏 |
| 二级页面 | 顶部返回箭头 + 页面标题 | 顶部返回箭头 + 面包屑 |
| 详情页 | 无导航栏，浮动返回按钮 | 顶部导航栏 + 浮动返回按钮 |
| 发布页 | 顶部标题 + 关闭按钮 | 顶部导航栏 + 居中表单 |

#### 2.3 TabBar 设计

- 高度：56px + safe-area-inset-bottom
- 背景：`white/95` + `backdrop-blur-lg`
- 未选中：`gray-400` 图标 + `gray-400` 文字
- 选中：`coral-500` 图标 + `coral-500` 文字 + 底部指示条
- 发布按钮：珊瑚红圆形凸起（28px），白色加号图标
- 动画：选中态 spring scale [1, 1.2, 1]，指示条 spring 滑动

---

### 三、全局交互状态组件

#### 3.1 Toast 通知

统一使用全局 Toast 组件，从顶部滑入：

| 类型 | 样式 | 时长 | 示例 |
|------|------|------|------|
| success | 绿色 ✓ + 文字 | 2s | "发布成功" |
| error | 红色 ✕ + 文字 | 3s | "网络异常，请重试" |
| info | 灰色 ℹ + 文字 | 2s | "已复制到剪贴板" |
| loading | 旋转圈 + 文字 | 手动关闭 | "上传中..." |

样式：圆角胶囊（full），深色背景 `gray-800/90`，白色文字，居中固定顶部 60px。

#### 3.2 确认弹窗 Modal

用于删除、退出等危险操作的二次确认：

- 背景遮罩：`black/50` + `backdrop-blur-sm`
- 卡片：白色，圆角 24px，居中
- 标题：H2，居中
- 描述：Caption，灰色，居中
- 按钮：双按钮（取消 + 确认），确认按钮用红色表示危险操作
- 动画：scale 从 0.9 到 1，opacity 从 0 到 1

```
┌─────────────────────┐
│    确定删除这篇帖子？   │
│  删除后无法恢复          │
│                        │
│  [取消]    [删除]       │
└─────────────────────┘
```

#### 3.3 空状态

统一空状态组件 `<EmptyState icon title description action />`：

| 场景 | 图标 | 标题 | 描述 | 操作按钮 |
|------|------|------|------|----------|
| 首页无内容 | 📦 | 还没有内容 | 来发第一条买家秀吧 | 去发布 |
| 搜索无结果 | 🔍 | 没找到相关内容 | 换个关键词试试 | 无 |
| 评论为空 | 💬 | 暂无评论 | 快来抢沙发！ | 无 |
| 帖子不存在 | 📭 | 帖子不存在 | 可能已被删除或链接无效 | 返回首页 |
| 未登录 | 👤 | 登录后查看 | 登录后可以点赞评论 | 去登录 |
| 网络异常 | 📡 | 网络连接失败 | 请检查网络后重试 | 重试 |

样式：居中，图标 64px，标题 H2，描述 Caption 灰色，按钮 btn-primary。

#### 3.4 骨架屏 Skeleton

- 圆角与目标元素一致
- shimmer 动画：`linear-gradient(90deg, #f0ebe6 25%, #e8e0d8 50%, #f0ebe6 75%)`
- 背景尺寸 200%，1.5s 循环
- 首页骨架屏：完整还原布局结构（标签栏 + 4 张卡片）
- 详情页骨架屏：图片区 + 标题行 + 内容行

#### 3.5 下拉刷新

- 触发阈值：下拉超过 60px
- 动画：珊瑚红旋转圈
- 文案：下拉 → "释放刷新" → "刷新中..." → 完成
- 超时：10s 后自动恢复

---

### 四、图片策略

#### 4.1 上传规范

| 环节 | 规则 |
|------|------|
| 选择 | 最多 9 张，支持相册 + 拍照 |
| 压缩 | 长边 ≤ 2048px，质量 85%，目标 < 500KB/张 |
| 格式 | 上传时转 WebP（节省 30%+ 带宽） |
| 缩略图 | 封面图生成 400px 宽缩略图（瀑布流用） |
| 存储路径 | `posts/{userId}/{timestamp}-{random}.webp` |
| 原图保留 | 不保留，压缩后即为最终版本 |

#### 4.2 展示规范

| 场景 | 尺寸 | 模式 | 说明 |
|------|------|------|------|
| 瀑布流封面 | 宽度自适应，高度按比例 | `object-cover` | 随机高度 180~260px |
| 详情页轮播 | 宽度 100%，4:3 | `object-cover` | snap 滚动 |
| 全屏预览 | 最大宽度 90vw，最大高度 80vh | `object-contain` | 深色背景 |
| 用户头像 | 固定尺寸 | `object-cover` + `rounded-full` | 5/8/9/72px |

#### 4.3 加载策略

- 瀑布流：`loading="lazy"` + Intersection Observer
- 详情页首图：预加载，`loading="eager"`
- 占位图：统一灰色背景 + 居中图标
- 加载失败：显示占位图 + "图片加载失败" 提示
- 图片 CDN URL 格式（Supabase Storage）：
  ```
  https://{project}.supabase.co/storage/v1/object/public/posts/{path}
  ```

#### 4.4 图片预览

- 全屏深色背景 `black/95`
- 支持左右滑动切换（snap）
- 底部圆点指示器
- 右上角关闭按钮 ×
- 双击放大（移动端），滚轮放大（PC 端）

---

### 五、登录与权限体系

#### 5.1 登录方式（优先级排序）

| 方式 | 优先级 | 说明 |
|------|--------|------|
| 手机号 + 验证码 | P0 | 国内用户主要方式 |
| 微信登录 | P0 | 社交账号快捷登录 |
| 邮箱 + 密码 | P1 | 备选方案 |
| 游客浏览 | P0 | 不登录可浏览，互动需登录 |

#### 5.2 未登录权限矩阵

| 操作 | 未登录 | 已登录 |
|------|--------|--------|
| 浏览帖子列表 | ✅ | ✅ |
| 查看帖子详情 | ✅ | ✅ |
| 搜索 | ✅ | ✅ |
| 点赞 | ❌ 弹出登录引导 | ✅ |
| 评论 | ❌ 弹出登录引导 | ✅ |
| 发布帖子 | ❌ 跳转登录页 | ✅ |
| 查看个人中心 | 显示登录卡片 | ✅ |
| 关注用户 | ❌ 弹出登录引导 | ✅ |

#### 5.3 登录引导交互

- 点赞/评论时触发：底部 Sheet 弹出，包含 logo + "登录后可点赞评论" + 登录按钮
- 发布时触发：跳转独立登录页
- 登录后自动回到之前的操作继续执行

#### 5.4 Token 管理

- 使用 Supabase Auth，JWT 存储于 `localStorage`
- Token 过期：自动刷新（Supabase SDK 内置）
- 刷新失败：清除登录态 + Toast 提示 "登录已过期，请重新登录"

---

### 六、分享与 SEO

#### 6.1 分享策略

| 平台 | 分享形式 | 内容 |
|------|----------|------|
| 微信好友 | 小程序卡片 / H5 链接卡片 | 封面图 + 标题 + "来自买家说" |
| 朋友圈 | H5 链接 | 封面图 + 标题 |
| 复制链接 | URL | `https://buyer-show.com/post/{id}` |
| 生成海报 | 图片 | 封面图 + 标题 + 二维码 + 评分 |

#### 6.2 SEO Meta 标签

每个帖子页独立生成：

```html
<title>{post.title} - 买家说</title>
<meta name="description" content="{post.content 前 120 字}" />
<meta property="og:title" content="{post.title}" />
<meta property="og:description" content="{post.content 前 80 字}" />
<meta property="og:image" content="{post.images[0]}" />
<meta property="og:url" content="https://buyer-show.com/post/{id}" />
<meta property="og:type" content="article" />
<meta name="twitter:card" content="summary_large_image" />
```

#### 6.3 结构化数据 (Schema.org)

```json
{
  "@context": "https://schema.org",
  "@type": "Review",
  "name": "{post.title}",
  "reviewBody": "{post.content}",
  "itemReviewed": {
    "@type": "Product",
    "name": "{post.product_name}"
  },
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "{post.rating}",
    "bestRating": "5"
  },
  "author": {
    "@type": "Person",
    "name": "{post.user.nickname}"
  },
  "datePublished": "{post.created_at}",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingCount": "{post.like_count}",
    "reviewCount": "{post.comment_count}"
  }
}
```

#### 6.4 Sitemap

- 自动生成 `sitemap.xml`，包含所有 active 状态的帖子 URL
- 更新频率：每次发布新帖子时重新生成
- 提交至百度站长平台 + Google Search Console

---

### 七、性能基线

#### 7.1 核心指标目标

| 指标 | 目标值 | 测量工具 |
|------|--------|----------|
| LCP (最大内容绘制) | < 2.0s | Lighthouse |
| FID (首次输入延迟) | < 100ms | Lighthouse |
| CLS (累积布局偏移) | < 0.1 | Lighthouse |
| TTI (可交互时间) | < 3.0s | Lighthouse |
| 首屏 JS 体积 | < 150KB | Bundle analyzer |

#### 7.2 优化策略

| 策略 | 实现方式 |
|------|----------|
| 代码分割 | Next.js 自动按路由分割 |
| 图片懒加载 | `loading="lazy"` + 占位骨架屏 |
| 字体优化 | `font-display: swap` + 系统字体优先 |
| 预加载 | 帖子卡片 hover/长按时 prefetch 详情页 |
| CDN | EdgeOne Pages 全球 CDN（国内走腾讯 CDN） |
| 缓存 | 静态资源 `Cache-Control: max-age=31536000, immutable` |
| 离线 | PWA Service Worker 缓存已浏览帖子 |
| 压缩 | gzip / brotli 自动压缩（EdgeOne 支持） |

#### 7.3 监控

- 接入 EdgeOne Analytics（免费）
- 错误监控：全局 ErrorBoundary 捕获 + 上报
- 性能监控：`web-vitals` 库采集 LCP/FID/CLS

---

### 八、无障碍 (Accessibility)

#### 8.1 语义化要求

- 页面标题：每页唯一 `<h1>`
- 图标按钮：必须 `aria-label`
- 图片：必须 `alt` 描述文字
- 表单：`<label>` 关联 `<input>`
- 动画：`prefers-reduced-motion` 媒体查询降级

#### 8.2 交互要求

- 可聚焦：所有交互元素支持 Tab 键导航
- 焦点可见：`:focus-visible` 显示 outline
- 颜色对比度：文字与背景对比度 ≥ 4.5:1（WCAG AA）
- 触控目标：最小 44×44px（iOS HIG）

#### 8.3 需要补全的 aria-label

| 元素 | aria-label |
|------|------------|
| 返回按钮 | "返回上一页" |
| 刷新按钮 | "刷新内容" |
| 点赞按钮 | "点赞" / "取消点赞" |
| 评论发送 | "发送评论" |
| 关闭预览 | "关闭图片预览" |
| 删除图片 | "删除第 N 张图片" |
| 搜索按钮 | "搜索" |
| 清除搜索 | "清除搜索内容" |

---

### 九、动效规范

#### 9.1 动画原则

- 时长：微交互 150~300ms，页面转场 300~500ms
- 缓动：交互用 `ease-out`，弹跳用 `spring`
- 克制：同一屏幕不超过 2 种同时进行的动画
- 尊重用户：`prefers-reduced-motion: reduce` 时关闭非必要动画

#### 9.2 已定义的动效清单

| 动效 | 参数 | 触发场景 |
|------|------|----------|
| fadeInUp | 0.45s, delay 0.08s×index | 列表项错落淡入 |
| heartbeat | 0.6s, scale [1,1.4,0.9,1.2,1] | 点赞 |
| shimmer | 1.5s infinite | 骨架屏 |
| slideUp | 0.3s ease-out | 底部 Sheet 弹出 |
| spring scale | stiffness 300, damping 25 | TabBar 选中、按钮点击 |
| rotate 360 | 0.8s linear infinite | 刷新图标旋转 |
| staggerChildren | 0.06s interval | 瀑布流卡片入场 |

#### 9.3 Framer Motion 常用 variants

```typescript
// 列表项错落淡入
const listItem = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.06 }
  })
}

// 页面转场
const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.3 }
}

// 按压反馈
const pressable = {
  whileTap: { scale: 0.96 },
  whileHover: { scale: 1.02 }  // PC only
}
```

---

### 十、响应式断点

| 名称 | 范围 | Tailwind | 布局 |
|------|------|----------|------|
| 手机 | < 768px | 默认 | 单列/双列，底部 TabBar，430px 居中 |
| 平板 | 768~1023px | `md:` | 三列瀑布流，顶部导航 |
| 桌面 | 1024~1279px | `lg:` | 四列瀑布流 |
| 大屏 | ≥ 1280px | `xl:` | 五列瀑布流 |

---

### 十一、组件命名规范

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| 页面组件 | `page.tsx` + `client.tsx` | `post/[id]/page.tsx` |
| UI 组件 | PascalCase，单一职责 | `PostCard.tsx` |
| 布局组件 | `layout/` 目录 | `layout/TabBar.tsx` |
| 业务组件 | `features/` 目录 | `features/CommentList.tsx` |
| Hook | `use` 前缀 | `usePosts.ts`, `useLike.ts` |
| 工具函数 | camelCase | `formatTime.ts`, `resolveFileIDs.ts` |

---

### 十二、错误处理规范

#### 12.1 错误码映射

| 错误码 | 用户提示 | 处理方式 |
|--------|----------|----------|
| 网络超时 | "网络不太给力，点重试看看" | 显示重试按钮 |
| 401 | "登录已过期，请重新登录" | 清除登录态 + 弹出登录 |
| 403 | "该内容已被删除或隐藏" | 显示空状态 |
| 404 | "页面不存在" | 显示 404 页面 |
| 429 | "操作太频繁，稍后再试" | Toast 提示 |
| 500 | "服务器开小差了" | 显示重试按钮 |
| 图片上传失败 | "图片上传失败，请重试" | Toast + 保留选择状态 |
| 内容违规 | "内容包含违规信息，请修改" | Modal 提示 |

#### 12.2 全局 ErrorBoundary

- 页面级：每页一个 ErrorBoundary，捕获渲染错误
- 组件级：关键组件（帖子列表、评论区）独立 ErrorBoundary
- 兜底 UI：显示空状态组件 + "重新加载" 按钮

---

### 十三、图标系统

所有图标统一由 `src/components/ui/icons.tsx` 导出，禁止在业务组件中内联 SVG。

| 属性 | 默认值 |
|------|--------|
| `size` | 20 |
| `viewBox` | `0 0 24 24` |
| `stroke` | `currentColor` |
| `strokeWidth` | 1.8 |
| `fill` | `none` |

已有图标：EditPencilIcon、BookmarkIcon、ChatBubbleIcon、HeartIcon、PeopleIcon、PersonIcon、LockIcon、LogOutIcon、TrashIcon、ShieldIcon、ChevronRightIcon、ChevronLeftIcon、SearchIcon、SunIcon、MoonIcon、MonitorIcon。

新增图标时在 `icons.tsx` 追加命名导出，保持同一套 props 接口 `{ size?: number; className?: string }`。

### 十四、暗色模式 (Dark Mode)

**策略**：Tailwind `darkMode: 'class'`，通过 `<html class="dark">` 切换。

**暗色色板**：

| Token | 色值 | 用途 |
|-------|------|------|
| `dark-50` | `#0a0a0a` | 最深背景 |
| `dark-100` | `#141414` | 页面背景 |
| `dark-200` | `#1e1e1e` | 卡片背景 |
| `dark-300` | `#282828` | 凸起表面 |
| `dark-400` | `#333333` | 输入框背景 |
| `dark-500` | `#444444` | 静默表面 |

**暗色阴影**：`shadow-card-dark`、`shadow-float-dark`、`shadow-modal-dark`。

**主题切换**：`store/ui.ts` 的 `theme` 字段支持 `'light' | 'dark' | 'system'` 三种模式。`ThemeProvider.tsx` 管理 localStorage 持久化 + 系统偏好监听。反闪烁脚本在 `layout.tsx` `<head>` 中内联执行。

**编码规范**：所有新增/修改的组件必须同时提供 `dark:` 变体（背景、文字、边框、分割线）。品牌色 coral-500 在深浅模式通用，无需额外 dark 变体。

---

*文档版本：v1.1 | 最后更新：2026-07-06*
