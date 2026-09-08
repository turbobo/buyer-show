# 买家说 — Qoder / AI 编码助手项目说明

> 本文档供 **Qoder / Claude Code / Cursor / Cline** 等 AI 编码工具读取，帮助其快速理解项目结构、遵守项目规范、调用正确的工作流。
>
> 优先级：**本文档 > `CLAUDE.md` > `AGENTS.md` > 父目录 `MyApp/AGENTS.md`**

---

## 一、项目概要

| 项目 | 信息 |
|---|---|
| 项目名 | 买家说（buyer-show） |
| 定位 | 购物种草社区 H5 应用 |
| 主入口 | `http://localhost:3000`（dev） |
| 部署目标 | EdgeOne Pages（静态导出） |
| 数据库 | Supabase（PostgreSQL + Auth + Storage） |
| 代码规范强制工具 | `CLAUDE.md` + `AGENTS.md`（项目级）+ `~/.qoder/rules/*.md`（用户级） |

---

## 二、技术栈（锁定版本，禁止擅自升级）

| 技术 | 版本 | 备注 |
|---|---|---|
| Next.js | 14 (App Router) | `output: 'export'` 静态导出 |
| React | 18 | |
| TypeScript | 5.4 | `strict: true` + `noUncheckedIndexedAccess: true` |
| Tailwind CSS | 3.4 | **禁止独立 CSS 文件**，全部用 Tailwind 类 |
| Framer Motion | 11 | 动效 |
| Zustand | 4 | 全局 store ≤ 3 个（`useUserStore` / `useUIStore`） |
| Supabase JS | 2.45 | PostgREST + Auth |
| Node | 20.18.0 | |
| 包管理 | npm | 禁止 pnpm/yarn |

**构建命令**：`cd buyer-show && npm run build`（生产）/ `npm run dev`（开发）

---

## 三、目录结构

```
buyer-show/
├── AGENTS.md              # 项目级通用代码规范（强制）
├── CLAUDE.md              # Claude Code 入口规范（指向三份详细文档）
├── QODER.md               # 本文档（AI 工具项目说明）
├── UI设计规范文档.md       # 色彩/字体/间距/组件/动效/响应式
├── 技术开发规范.md         # 目录/TS/API/错误处理/安全/性能
├── 技术方案文档.md         # 架构/数据库设计/迁移记录（§1-§11）
├── 产品设计文档.md         # 功能列表/进度条/待办（§1-§5）
├── supabase/
│   ├── migration.sql              # v1 基础表
│   ├── migration-v2-favorites.sql # 帖子收藏
│   ├── migration-v3-account.sql   # 昵称唯一性
│   ├── migration-v4-favorites-extra.sql # 评论/标签收藏
│   ├── migration-v5-admin.sql     # 管理员模块
│   ├── migration-v5.2-admin-init.sql
│   ├── migration-v5.3-tags.sql    # 标签管理
│   ├── migration-v6-post-status-int.sql # posts.status SMALLINT
│   ├── migration-v7-profile-tag-status-int.sql # profiles/tags SMALLINT
│   ├── migration-v8-fix-unban-restore-posts.sql
│   ├── migration-v9-rebuild-posts-indexes.sql
│   └── migration-v10-index-audit-fixes.sql
└── src/
    ├── app/           # 页面（page.tsx + client.tsx + loading.tsx + error.tsx）
    ├── components/
    │   ├── ui/        # 原子组件（Toast, Modal, EmptyState, SmartImage）
    │   ├── layout/    # 布局组件（TabBar, TopNav）
    │   └── [feature]/ # 业务组件（post/, profile/, publish/, search/, admin/）
    ├── hooks/         # 自定义 Hooks（useAuthGuard, usePublishForm 等）
    ├── lib/           # 工具函数 + 常量（constants.ts / supabase.ts）
    ├── services/      # API 请求层（post.ts / comment.ts / user.ts / auth.ts / follow.ts）
    ├── store/         # Zustand store（user.ts / ui.ts）
    └── types/         # TypeScript 类型（index.ts）
```

---

## 四、规则配置总览

### 4.1 项目级规则（项目根目录）

| 文件 | 内容 | 强制级别 |
|---|---|---|
| `AGENTS.md` | 通用代码规范（命名/TS/组件/状态/设计 Token/响应式/动效/API/安全/性能/无障碍/Git） | **强制** |
| `CLAUDE.md` | 入口指针，指向 `UI设计规范` / `技术开发规范` / `产品设计文档` | **强制** |
| `UI设计规范文档.md` | 色彩/字体/间距/组件样式/动效/响应式 | 写 UI 时必读 |
| `技术开发规范.md` | 目录/TS/API/错误处理/安全/性能 + §11 数据库 SMALLINT 规范 | 写后端/DB 时必读 |
| `技术方案文档.md` | 架构/数据库设计/迁移记录（§1-§11） | 改架构/DB 时同步更新 |
| `产品设计文档.md` | 功能列表/进度条/待办 | 改功能时同步更新 |

### 4.2 父目录规则（MyApp/AGENTS.md）

- **文档同步强制规则**：任何代码改动必须在同一次 commit 内同步 `技术方案文档.md` 或 `产品设计文档.md`
- 按改动类别决定目标文档（架构调整 → 技术方案 / 用户可感知功能 → 产品设计）
- 禁止单独凑「docs: 更新文档」commit

### 4.3 用户级规则（~/.qoder/rules/）

| 文件 | 触发 | 备注 |
|---|---|---|
| `pre-commit-review.md` | `always_on` | Commit 前自动审核（**Java LDS 规范**，套用到本项目部分检查项会误判，建议跳过「分层架构」「MQ 幂等」项） |
| `linyearRules.md` | `always_on` | LDS 项目 Java 可测试性规范（**对本项目不生效**） |

### 4.4 用户级 Skills（~/.qoderwork/skills/）

15 个已安装，**与本买家说项目直接相关**的：

| Skill | 用途 | 触发时机 |
|---|---|---|
| `docx` / `pdf` / `pptx` / `xlsx` | 文档读写 | 用户要求生成报告/导出 |
| `find-skills` | 搜索 skill 市场 | 接到复杂任务时先用 |
| `create-skill` | 创建新 skill | 沉淀可复用工作流 |
| `lds-java-code-rule` | 生成 Java 项目规范 | 不适用本项目 |

### 4.5 用户级 Hooks（~/.qoder/hooks/）

| Hook | 作用 |
|---|---|
| `guard-prompt.sh` / `guard-tool.sh` | Prompt/Tool 调用前置守卫 |
| `audit-session.sh` / `audit-tool.sh` | 会话/工具审计日志 |
| `notify.sh` / `dump-notification.sh` | 通知转发 |
| `check-stop.sh` | 中断检查 |

---

## 五、关键编码约定（速查）

### 5.1 数据库 SMALLINT + 常量（最重要，违反率最高）

**所有状态/角色/标志字段用 `SMALLINT`，语义由 `src/lib/constants.ts` 的 `as const` 对象维护**：

| 表.字段 | 常量 | 取值 |
|---|---|---|
| `posts.status` | `POST_STATUS` | 0=ACTIVE / 1=HIDDEN / 2=DELETED |
| `profiles.role` | `USER_ROLE` | 0=USER / 1=ADMIN |
| `profiles.status` | `USER_STATUS` | 0=ACTIVE / 1=BANNED / 2=DELETED |
| `tags.status` | `TAG_STATUS` | 0=ACTIVE / 1=ARCHIVED / 2=DELETED |

**正确用法**：
```ts
import { POST_STATUS } from '@/lib/constants'
await supabase.from('posts').select('*').eq('status', POST_STATUS.ACTIVE)
```

**禁止**：
```ts
// ❌ 字符串字面量
await supabase.from('posts').select('*').eq('status', 'active')
```

### 5.2 Supabase 迁移脚本命名

```
supabase/migration-vN-xxx.sql
```

- `N` 递增，当前到 `v10`
- 每加一版必须同步：
  - `技术方案文档.md` §7.N 增加章节
  - `产品设计文档.md` 进度条 / 已完成清单
- 迁移五步法：加临时列 → 数据迁移 → DROP POLICY/INDEX/CONSTRAINT → DROP 旧列 + RENAME → 重建索引/RLS/RPC
- **DROP 列/函数前必须先用 `\d+` 列出依赖，集中 DROP 完再 DROP 目标**（否则 PG 报 2BP01）

### 5.3 Service 层规范

- 所有 DB 访问必须走 `src/services/*.ts`
- **组件内禁止直接调 `supabase.from()`**
- 命名：动词 + 名词（`fetchPosts` / `createPost` / `toggleLike`）
- 错误：抛 `Error`（含 `message`），调用方 `try/catch` 弹 Toast

### 5.4 响应式 max-width 链

PC 端内容容器必须复用同一 max-width 链，否则宽屏下左右视觉失衡：

```
max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto
```

已应用位置：`TopNav` / `ProfileHeader` / `ProfilePage`

### 5.5 Tailwind grid + divide 分割线

列分割时**外层禁止用全局 `p-*`**（会让分割线被截断），改为每个 cell 用 `py-*` + 外层 `overflow-hidden`。

### 5.6 单文件行数

- 单文件 ≤ **300 行**（超过必须拆分）
- JSX ≤ **80 行**（超过必须抽子组件）

---

## 六、常见工作流速查

### 6.1 新增功能

1. 读 `产品设计文档.md` 确认功能定位
2. 读 `UI设计规范文档.md` 确认视觉规范
3. 如需改 DB：写 `supabase/migration-vN-xxx.sql`
4. 实现：`services/` → `hooks/` → `components/` → `app/*/page.tsx`
5. 同步文档：
   - 架构/DB 改动 → `技术方案文档.md` §7.N
   - 用户可感知功能 → `产品设计文档.md` 进度条 + 已完成清单
6. Commit：`feat(scope): 描述`（中文 subject，≤ 50 字）

### 6.2 修复 Bug

1. 定位根因（先 grep，再读相关代码）
2. 修复：优先在 `services/` 层修复（组件层不改 DB 逻辑）
3. 如同步文档：
   - 修复方案进 `技术方案文档.md` §7.N
   - 功能状态进 `产品设计文档.md` 已完成清单
4. Commit：`fix(scope): 描述`

### 6.3 DB 索引优化

1. 盘点 `supabase/*.sql` 全部 `CREATE INDEX`
2. 比对 `src/services/*.ts` 实际查询模式
3. 识别：冗余 / 缺漏 / 列序不当 / partial vs 全量 / 陈旧索引
4. 写新 migration（如 `migration-vN-xxx.sql`）
5. 用 `CREATE INDEX CONCURRENTLY IF NOT EXISTS` 避免锁表
6. **注意**：`IF NOT EXISTS` 只检查索引名不检查定义，多版本同名索引需先 DROP 再重建
7. 同步 `技术方案文档.md` §7.N

### 6.4 启动 / 重启开发服务器

```bash
cd /Users/qinghang/Documents/QoderWorkSpace/MyApp/buyer-show
npm run dev
```

访问 `http://localhost:3000`。重启：`pkill -f "next dev"; pkill -f "next-server"`。

---

## 七、验证检查清单

每次修改代码后自查（Code Review 10 项）：

- [ ] 命名符合规范（PascalCase 组件 / camelCase 函数变量 / UPPER_SNAKE_CASE 常量）
- [ ] 单文件 ≤ 300 行 / JSX ≤ 80 行
- [ ] 无 `any` / `@ts-ignore` / `console.log`
- [ ] 图片有 `loading="lazy"`（首屏首图除外）
- [ ] 列表 `key` 唯一（禁止 index 作 key，除非列表不变）
- [ ] 用户输入已前端校验
- [ ] 图标按钮有 `aria-label`
- [ ] 手机端（< 768px）和 PC 端（≥ 1280px）都正常显示
- [ ] 错误已处理（不吞错误）
- [ ] 无重复代码（DRY）

**TypeScript 严格模式附加检查**：
- [ ] 无 `!` 非空断言（用条件判断）
- [ ] 无 `enum` 关键字（用 `const` 对象 + type）
- [ ] 单字母变量禁用（循环 `i` 除外）

**数据库附加检查**：
- [ ] 状态字段走 `src/lib/constants.ts` 常量，无字面量
- [ ] 新增/修改 migration 已同步 `技术方案文档.md` §7.N

---

## 八、已知陷阱

| 陷阱 | 说明 | 规避 |
|---|---|---|
| `IF NOT EXISTS` 索引同名冲突 | 只检查名不检查定义，多版本同名单列 vs 复合索引会被静默跳过 | 先 `DROP INDEX IF EXISTS` 再 `CREATE INDEX` |
| `DROP COLUMN` 报 2BP01 | 列/函数被 RLS/索引/约束引用时不能直接 DROP | 先 DROP 所有依赖，集中处理 |
| `DROP FUNCTION` 跨表依赖 | `tags_admin_all` 引用 `is_admin` 致失败 | 迁移前用 `\d+` 列出所有依赖 |
| `UNIQUE(a,b)` 自带 backing index | 再建 `(a)` 单列索引纯属冗余 | 盘点索引时检查 UNIQUE 约束 |
| `grid + divide-x + p-*` 分割线被截断 | 外层 padding 会让分割线不顶天立地 | cell 用 `py-*` + 外层 `overflow-hidden` |
| `useSearchParams` hydration | 必须包在 `<Suspense>` 内 | 见 Next.js 官方文档 |
| `Math.random()` hydration mismatch | 服务端与客户端值不一致 | 用固定数组 index 替代 |

---

## 九、缺失配置（待补）

| 项 | 说明 | 建议 |
|---|---|---|
| 项目级 `.qoder/skills/` | 当前无专属 skill | 可沉淀「buyer-show-commit」（自动跑 SQL 迁移校验）、「update-buyer-show-docs」（一键同步三份文档） |
| 项目级 `.qoder/hooks/` | 当前复用用户级 hooks | 可加项目级 pre-commit 校验（强制跑 `tsc` + `lint`） |
| `pre-commit-review.md` 误判 | 用户级规则是 Java LDS 规范，套用到 TS 项目部分检查项会误判 | 项目级覆盖或加 `ignore` 配置 |
| ESLint 配置 | 当前 `.eslintrc.json` 已启用，但 `src/app/page.tsx:44` 仍有 1 处 `addToast` 依赖 warning 未修 | 加到 dep 数组或拆 `useCallback` |

---

## 十、AI 工具调用约定

当 AI 工具（Qoder / Claude / Cursor 等）接到本项目任务时：

1. **先读规范**：开工前读 `AGENTS.md` + 相关章节的 `技术开发规范.md` / `UI设计规范文档.md`
2. **先查现状**：用 `grep` / `find` 确认相关代码位置，避免重复造轮子
3. **按分层修改**：`services/` → `hooks/` → `components/` → `app/*/page.tsx`，**禁止在组件内直接调 `supabase.from()`**
4. **跑验证**：`npx tsc --noEmit` + `npm run lint` 必须 exit 0
5. **同步文档**：按 `AGENTS.md` 文档同步规则同步 `技术方案文档.md` / `产品设计文档.md`
6. **按 feature 拆 commit**：Conventional Commits 中文 subject ≤ 50 字，每次 commit 只做一件事
7. **不自动 push**：commit 完成后询问用户是否 `git push`

---

> 本文档由 Qoder 自动生成。如有遗漏或过时，请运行 `更新 QODER.md` 触发更新。
