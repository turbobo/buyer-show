# Buyer Show · UI 设计规范（现行版）

> **定位**：产品/UI 规范的**单一入口总结**（2026-09-16 校准至实际实现）。
> **源头文档**：《产品设计文档》§五（设计规范）、§七（管理后台）、§八（消息中心）；`开发设计框架.md`（工作区通用）。
> **使用方式**：开发新页面/组件前先对照本规范；与产品文档冲突时以产品文档最新设计推导为准，并回写本文档。
> **参考基准**：小红书（导航与个人主页体感）、Instagram、Pinterest、什么值得买；准则来源：ui-ux-pro-max。

---

## 一、设计理念（三原则）

1. **一致优先**——跨页导航、框架宽度、菜单形态恒定，页面切换不产生"变形感"（框架统一 / 菜单一致性均为硬规范）。
2. **轻量直接**——主操作 ≤1 次点击可达（TabBar/Header 常驻频道导航）；「返回」是兜底而非主通道（系统手势、频道直达为主）。
3. **有据可依**——一切视觉决策使用 Design Token，不写裸值（颜色/间距/圆角/阴影）；禁止 emoji 充当图标。

---

## 二、Design Tokens

### 2.1 品牌
珊瑚渐变圆角方块 + 白色购物袋 + 对话点；唯一源文件 `frontend/public/favicon.svg`（浏览器图标 / 导航 logo / 登录页同源）。

### 2.2 色彩（注册于 `frontend/src/index.css` `@theme`）

| Token | 色值 | 用途 |
|-------|------|------|
| `coral` | `#FF6B35` | 品牌主色、CTA、选中态、强调 |
| `coral-light` | `#FFF0E8` | 高亮背景、选中底色 |
| `coral-dark` | `#E55A2B` | 按压态、hover 加深 |
| `warm-bg` | `#FAF7F5` | 页面背景 |
| `warm-100/200/300` | `#F5EDE8` / `#E8DDD5` / `#D4C5B9` | 浅底 / 分隔线 / 边框占位 |

语义色（shadcn 变量）：`background` / `foreground` / `muted-foreground` / `destructive`；状态色：成功 `#10B981`、警告 `#F59E0B`、错误与点赞红 `#EF4444`。

### 2.3 字体层级

| 层级 | 字号/行高/字重 | 用途 |
|------|----------------|------|
| H1 | 20/28/700 | 页面标题、详情标题 |
| H2 | 16/24/700 | 卡片标题、区块标题 |
| Body | 14/22/400 | 正文、评论 |
| Caption | 12/18/400 | 时间、辅助说明 |
| Tiny | 10/14/500 | 标签、TabBar 文字 |

字体栈：`-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`；数字字体 `DIN Alternate, Avenir Next`（价格/统计）。

### 2.4 间距（基准 4px）
`xs 4 / sm 8 / md 12 / lg 16 / xl 20 / 2xl 24 / 3xl 32`——所有间距必须为 4 的倍数（Tailwind `p-1..p-8`）。

### 2.5 圆角
`sm 8`（输入框/小标签）· `md 12`（按钮/小卡片）· `lg 16`（帖子卡片）· `xl 24`（弹窗/Sheet，实现用 `rounded-2xl`）· `full`（头像/胶囊/标签）。

### 2.6 阴影
`shadow-sm` 卡片默认 · `shadow-md` 悬浮/导航 · `shadow-lg` 弹窗/下拉 · `shadow-coral`（`0 4px 12px rgba(255,107,53,0.25)`）主色按钮。

### 2.7 暗色模式（**现行已实现**）
`html.dark` 切换 + `useTheme`；组件一律使用 token（`bg-card`/`bg-background`/`text-foreground`），**禁止硬编码白底黑字**；品牌 coral 深浅模式通用。

---

## 三、布局框架（全局硬规范）

| 项 | 规范 |
|----|------|
| **内容容器** | 全站统一 `max-w-5xl`（1024px）——含 Feed；表单类页在容器内居中收窄（3xl） |
| **页面结构** | 顶部导航（h-14，sticky）→ 内容区（`mx-auto max-w-5xl px-4 py-6`）→ （移动）底部 TabBar（h-16 + `safe-bottom`） |
| **断点** | 主断点 **768px（md）**：<768 移动布局（单列 + TabBar）；≥768 PC 布局（多列 + Header）。Feed 瀑布流列数：≥768 → 3 列 / <768 → 2 列 |
| **安全区** | 底部 `safe-bottom`（`env(safe-area-inset-bottom)`）；`viewport-fit=cover` |
| **滚动** | 唯一滚动容器为 window；`html { scrollbar-gutter: stable }`（防页面切换抖动）；避免嵌套滚动区 |
| **页面过渡** | 仅透明度动画（详见 §七 红线）；全局 fixed 组件（Header/TabBar）位于动画容器**之外** |

> ⚠️ **flex 容器陷阱（强制）**：当页面根为 `flex flex-col`（如消息页）时，内容容器必须写全 `mx-auto w-full max-w-5xl px-4`——缺少 `w-full` 会因交叉轴 auto margin 触发 shrink-to-fit，导致 `max-w-5xl` 失效（内容收缩为内容宽度，如消息双栏从 1024px 缩成 524px）。

---

## 四、导航体系（v2→v4 汇总，现行）

### 4.1 层级模型
- **频道层（一级）**：首页 · 消息 · 发布 · 我的——PC 由全局 Header 承担；移动由底部 TabBar 承担。
- **层级层（二级）**：页面返回/标题——**仅移动端常驻**（`←返回 + ⌂首页 + 标题`）；PC 仅「详情页、发布页」保留第二行，其余页面 PC 无第二行。

### 4.2 PC 导航（现行）
- **单行 Header / Feed 导航同构菜单**（二者菜单与顺序完全一致）：

```
[买家说 logo→首页] [🏠 首页] [💬 消息] [(居中)搜索] [🌙 主题] [审核台·管理员] [头像+昵称] [退出图标] [+ 发布]
```

- 显示规则：Feed 导航服务首页；Header 服务其余 Stack 页（首页 / 登录 / 管理后台不显示 Header）。
- **菜单一致性为硬规范**：新增菜单项必须两侧同步（Feed 导航与 DesktopHeader）。
- 高亮规则：消息/通知页 → 「消息」；首页 Feed → 「首页」；其余不高亮。
- 搜索框：统一居中（`mx-auto max-w-xl h-10 rounded-full`）；首页为真输入框，其余页点击 → 跳首页聚焦（浮层化为 U24 规划）。
- 用户区：头像（h-8，Fallback 昵称首字）+ 昵称（截断）+ 退出图标；退出使用**二次确认弹窗**（Esc 关闭 / 提交中禁用 / 成功后 toast + 跳首页）；未登录显示「登录」。
- 键盘：`Esc` = 返回上一页（弹窗打开时豁免）；logo 与「首页」回首页。
- logo 必须可点击（button + `aria-label="返回首页"`）。

### 4.3 移动导航
- **Stack 导航**：`[← 返回] [⌂ 首页] [标题 truncate]`，h-14 sticky；⌂ 点击回首页（列表/主页/编辑/消息/通知页均适用）。
- **底部 TabBar（AppTabBar）**：一级频道常驻 5 项（首页/搜索/发布/消息/我的）；发布为凸起 coral 圆钮。
  - 隐藏规则：`/`（Feed 自带）、`/posts/*`（详情沉浸）、`/publish`（表单）、`/login`、`/admin/*`。
  - 同 Tab 点击 = 回到频道根页；已在根页 = 平滑回顶；搜索 Tab = 回首页并聚焦搜索框。
  - 占位间距：显示时输出 `h-16` 占位，防止内容被遮挡。
- **沉浸页**：帖子详情底部为互动操作栏（无 TabBar）。
- 系统手势零成本启用：不拦截屏幕边缘触摸（iOS 边缘右滑 / Android 返回键原生生效），**禁止自定义边缘手势**。

### 4.4 吸顶与滚动行为
- **个人主页 Tab 吸顶**：分享/收藏/赞过 `sticky top-14`（紧贴 Header / 移动导航下），资料卡随滚动移出。
- **滚动位置恢复**：PUSH（前进）回顶；POP（后退，如详情→Feed）还原离开前位置（含异步加载短轮询重试）。
- 返回语义统一 `smartBack`（history 返回；外链直接进入时兜底回首页）。

### 4.5 例外与独立体系
| 页面 | 规范 |
|------|------|
| 登录 | 居中卡片 + 左上返回首页；无 Header/TabBar |
| 404 | 居中状态页 + 「回到首页」主按钮；无二级导航 |
| 管理后台 | 侧栏（桌面常驻/移动抽屉）+ 顶栏独立体系；提供「返回前台」 |
| 图片全屏预览 | `fixed z-[9999]` 深色层 + `role="dialog"`（Esc 自动豁免全局返回） |

---

## 五、组件规范

### 5.1 按钮
- 变体：**primary**（`bg-coral text-white hover:bg-coral-dark`，如发布）/ **secondary**（频道高亮）/ **ghost** / **outline** / **destructive**（退出等破坏性）。
- 尺寸：`size="icon"` 热区 44×44px（所有图标按钮）；`sm` 行内操作；主 CTA 胶囊 `h-9 rounded-full`。
- 图标按钮**必须** `aria-label`；频道按钮 = 图标 + 文字（`<Icon className="mr-1 h-4 w-4" />` 模式）。
- 异步按钮：提交中 `disabled` + 文案「xx中...」（防连点）。

### 5.2 弹窗
- 遮罩 `bg-black/50`（可加 backdrop-blur）；卡片 `rounded-2xl`；标题 H2 + 描述 Caption。
- **破坏性操作必须二次确认**（取消 + destructive 确认）；`autoFocus` 置于「取消」；`Esc` 关闭；`role="dialog" aria-modal="true"`。
- 表单内确认（如未保存离开）同规范。

### 5.3 Toast
| 类型 | 时长 | 示例 |
|------|------|------|
| success | 2s | 发布成功 / 已退出登录 |
| error | 3s | 网络异常，请重试 |
| info | 2s | 已复制到剪贴板 |
| loading | 手动关闭 | 上传中... |

固定顶部居中胶囊，深色底白字。

### 5.4 状态组件（三态全覆盖为硬要求）
- **Loading**：骨架屏（圆角与目标一致，shimmer 1.5s）；超过 300ms 的操作必须反馈。
- **Empty**：`EmptyState`（图标 + 标题 + 描述 + 可选 CTA，如「去发布」）。
- **Error**：就近展示错误 + 「重新加载」按钮；全局 `ErrorBoundary` + 关键区块独立兜底。

### 5.5 表单
- 每输入有可见 `<label>`（`htmlFor` 关联）；错误就地显示于字段下方；必填标记。
- 昵称等唯一性校验就地报错；未保存离开需确认。

### 5.6 图标
- 统一 `lucide-react`（禁止内联自绘 SVG、禁止 emoji）；尺寸 `h-4`（行内）/ `h-5`（按钮）；颜色 `currentColor`（品牌场景 `text-coral`）；图标集风格统一（stroke 一致）。

---

## 六、交互与反馈

| 主题 | 规范 |
|------|------|
| 确认策略 | 删除/封禁/退出/申诉处理等破坏性操作：**二次确认**；普通提交成功后 toast |
| 手势 | 下拉刷新（阈值 **56px**：下拉指示 → 松开刷新 → 刷新中，`Loader2` 旋转）；列表触底自动加载；长按无隐藏操作 |
| 触控 | 所有可点目标 ≥44×44px；相邻目标间距 ≥8px |
| 键盘 | `Esc` 全局返回（弹窗豁免）；`Tab` 焦点环可见；焦点顺序符合视觉顺序 |
| 深浅色 | 随系统/手动切换，全部 token 化实时生效 |
| 防抖 | 搜索输入 onBlur 延迟 200ms 关闭面板（blur 竞态防护）；高频事件 throttle/debounce |

---

## 七、动效规范

- **时长**：微交互 150–300ms；页面过渡 ≤300ms；禁装饰性长动画。
- **🔴 红线（强制）**：
  1. 页面过渡动画**仅使用 opacity**——**禁止在包裹页面的容器上加 transform**（transform 会改变内部 `fixed/sticky` 的定位基准，导致 TabBar 漂移、吸顶错位）。
  2. 全局 fixed 组件（Header / TabBar / Toast）必须渲染在过渡动画容器**之外**（兄弟层级）。
  3. 禁止动画 `width/height/top/left`（只用 `transform/opacity`）。
- **降级**：`prefers-reduced-motion: reduce` 时关闭非必要动画（`animation-duration: 0.01ms`）。
- 参考参数：fadeInUp 0.45s / stagger 0.06s / heartbeat 0.6s / shimmer 1.5s。

---

## 八、无障碍基线

- 每页唯一 `<h1>`；标题层级不跳级。
- 对比度 ≥ **4.5:1**（正文）；焦点 `:focus-visible` 珊瑚色 outline。
- 图片必有 `alt`（内容图用标题，装饰图 `alt=""`）；图标按钮必有 `aria-label`（返回上一页/返回首页/点赞/发送/关闭等）。
- 触控目标 ≥44×44px；状态不单靠颜色表达（配图标/文字）。
- `role="dialog" aria-modal`（弹窗）；全屏预览 `aria-label="图片预览"`。

---

## 九、图片规范（现行）

| 环节 | 现行规范 |
|------|----------|
| 上传 | ≤9 张（发布页）；JPEG/PNG/WebP；≤10MB；头像客户端压缩 ≤500KB |
| 存储 | MinIO `pending/` → 审核通过转 `published/`；缩略图 400px 已生成 |
| 展示 | 列表封面 `<img loading="lazy">` + `alt` + 失败兜底（渐变占位）；详情首图 eager；头像 `rounded-full object-cover` |
| 预览 | `ImageFullscreenViewer`：深色背景、缩放、键盘 ←/→、圆点指示、链接复制 |

---

## 十、命名与文案

### 10.1 命名
| 类型 | 规则 | 示例 |
|------|------|------|
| 页面 | `flows/<领域>/<名称>.tsx` | `flows/post-detail/detail.tsx` |
| 组件 | `components/<域>/<kebab>.tsx`，组件名 PascalCase | `components/layout/app-tabbar.tsx` → `AppTabBar` |
| Hook | `use` 前缀 | `use-theme.ts` |
| 服务 | `services/<领域>.ts` | `services/posts.ts` |

### 10.2 文案模式
- 确认弹窗标题：动词 + 「？」（「退出登录？」）；描述一句话后果说明。
- Toast：动词短语（「已复制到剪贴板」），无感叹号。
- 空态：标题（陈述）+ 描述（引导）+ 可选 CTA（去发布 / 回到首页）。
- 系统通知：完整句子 + 物件名（「你的申诉已通过，「xxx」已恢复公开」）。

---

## 十一、开发自检清单（提交前必查）

- [ ] 容器 `max-w-5xl`；导航结构与 §四 完全一致（含移动双入口、PC 单行菜单）
- [ ] 三态覆盖（loading/empty/error）；异步按钮 loading + 防连点
- [ ] 破坏性操作有二次确认；成功/失败有 toast
- [ ] 图标按钮 `aria-label`、图片 `alt`+`lazy`、键盘可达（Tab/Esc）
- [ ] 动效 ≤300ms；页面容器无 transform；fixed 组件在动画容器外
- [ ] 暗色模式检查（token 化自动生效，无硬编码白底）
- [ ] 移动（390px）与 PC（1440px）双尺寸验证；触控目标 ≥44px
- [ ] 与《产品设计文档》对应章节同步（功能变更时）

---

*文档版本：v1.0 | 2026-09-16 | 维护：功能迭代后同步更新本规范与《产品设计文档》*
