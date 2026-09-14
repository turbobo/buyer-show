# 买家说 — Qoder / AI 编码助手项目说明

> 本文档供 **Qoder / Claude Code / Cursor / Cline** 等 AI 编码工具读取，帮助其快速理解项目结构、遵守项目规范、调用正确的工作流。
>
> 优先级：**`AGENTS.md`（项目强制规范）→ `CLAUDE.md`（Claude Code 入口指针）→ 父目录 `MyApp/AGENTS.md`**；本文档为 AI 工具使用说明与速查，不属于强制规范。

---

## 一、项目概要

| 项目 | 信息 |
|---|---|
| 项目名 | 买家说（buyer-show） |
| 定位 | 购物种草社区（PC Web + 手机浏览器 + 小程序） |
| 前端入口 | `http://localhost:5173`（Vite dev）；Docker 全栈为 `http://localhost:3000` |
| 后端入口 | `http://localhost:8080`（Swagger：`/swagger-ui.html`） |
| 数据库 | MySQL 8.0 + Flyway 迁移（V1-V5 已执行验证） |
| 对象存储 | MinIO（图片 `pending/` → 审核通过后 `published/`） |
| 部署方式 | Docker Compose（已可用）+ Kubernetes（规划） |

---

## 二、当前技术栈（以代码为准，禁止擅自升级）

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | Vite 8 + React 19 + TypeScript 6 | SPA |
| 样式 | Tailwind CSS 4（`@theme` Token） | 自定义色 coral / warm-* |
| 路由 | react-router-dom 7 | 声明式路由于 `App.tsx` |
| 图标 | lucide-react | 禁止内联自绘 SVG |
| 状态 | 组件内 useState + `services/` 请求层 | **未引入**全局状态库（Zustand 为规划项） |
| 后端 | Spring Boot 3.3 + Java 21 + MyBatis-Plus | `server/` |
| 认证 | Spring Security + JWT 双 token | 401 自动刷新在 `services/http.ts` |
| 迁移 | Flyway `V{N}__{description}.sql` | 已执行版本禁止改写 |
| 规划中 | Redis 7 / Elasticsearch 8 / RabbitMQ 3.13 | 容器已就绪，代码未接入 |

**常用命令**：

```bash
./start-dev.sh / ./stop-dev.sh   # 一键启动/停止（中间件 + 后端 + 前端）
cd frontend && npm run dev       # 前端开发
cd frontend && npm run build     # 前端构建（tsc -b + vite build）
cd frontend && npm run lint      # oxlint
cd server && ./mvnw spring-boot:run   # 后端启动（需 JDK 21）
```

---

## 三、目录结构（当前）

```
buyer-show/
├── frontend/src/
│   ├── App.tsx                  # 路由声明
│   ├── components/ui/           # shadcn/ui 组件
│   ├── services/                # 请求层（http/auth/posts/comments/uploads/reports/admin）
│   ├── flows/                   # 业务 Flow（home-feed/post-detail/publish-post/auth/admin/messages）
│   └── lib/                     # 工具函数
├── server/src/main/java/com/buyershow/
│   ├── controller/              # Auth/Post/Comment/Upload/ContentReport/AdminModeration/Health
│   ├── service/                 # 业务逻辑（认证、帖子、评论、审核、举报、上传）
│   ├── mapper/                  # MyBatis-Plus Mapper（含自定义 SQL）
│   ├── entity/ dto/ config/ common/
│   └── resources/db/migration/  # Flyway V1-V5
├── app/                         # 移动端 uniapp X（待实现）
├── ui-prototype.html            # 移动端 UI 原型（15 屏）
└── 产品设计文档.md / 技术方案文档.md / 架构设计文档.md
```

---

## 四、规则配置总览

### 4.1 项目级（项目根目录）

| 文件 | 内容 | 强制级别 |
|---|---|---|
| `AGENTS.md` | 项目规范总纲：技术栈/目录/前后端规范/设计 Token/Git/文档同步 | **强制** |
| `CLAUDE.md` | Claude Code 入口：关键规则摘要与工作流 | **强制** |
| `产品设计文档.md` | 产品功能、**UI 设计规范（§五）**、待办台账 | 改功能/UI 时同步更新 |
| `技术方案文档.md` | 技术栈、数据库、API 契约（§5.5）、部署手册（§七） | 改架构/DB/API 时同步更新 |
| `架构设计文档.md` | 目标态架构、中间件/可观测性设计、演进路线 | 改架构方向时同步更新 |

### 4.2 父目录（MyApp/AGENTS.md）

- **文档同步强制规则**：任何代码改动必须在同一次 commit 内同步 `技术方案文档.md` 或 `产品设计文档.md`
- 禁止单独凑「docs: 更新文档」commit

### 4.3 用户级规则（~/.qoder/rules/）

| 文件 | 触发 | 备注 |
|---|---|---|
| `pre-commit-review.md` | `always_on` | Commit 前自动审核；含 Java LDS 专属检查项（分层架构/MQ 幂等），对本项目部分项不适用 |
| `linyearRules.md` | `always_on` | LDS 项目 Java 规范（对本项目整体不适用，仅参考通用项） |

> 用户级 Skills/Hooks 位于 `~/.qoderwork/skills/`、`~/.qoder/hooks/`，属环境级配置，本项目不依赖。

---

## 五、关键编码约定（速查）

### 5.1 状态字段

- 数据库用 `TINYINT`，语义由 **Java 枚举/常量**维护（如 `ModerationStatus`；用户 `role` 0=USER 1=ADMIN）
- 禁止在业务代码散落魔法数字；前端不维护状态码表，错误码由后端 `ErrorCode` 提供

### 5.2 数据库迁移（Flyway）

- 文件：`server/src/main/resources/db/migration/V{N}__{description}.sql`，`N` 递增
- **已执行版本禁止改写**；结构修正一律新增版本（参考 V5 对 V4 的加固方式）
- 新增迁移需同步：`技术方案文档.md` §6.2 迁移列表 + 相关设计章节
- 索引调整前先盘点实际查询模式（`WHERE / JOIN / ORDER BY`），单表索引原则上 ≤ 5 个

### 5.3 请求层与 Service

- 前端：所有 HTTP 请求收敛到 `src/services/*`，组件**禁止直接 fetch**；统一 `ApiError`（code + message）
- 后端：Controller（参数校验 JSR 380）→ Service（业务 + 事务）→ Mapper；统一响应 `R<T>`，业务异常抛 `BusinessException`
- 命名：动词 + 名词（`getFeed` / `createPost` / `toggleLike`）

### 5.4 内容宽度

PC 端内容容器统一 `mx-auto` 居中：常规页面 `max-w-3xl`，宽布局（审核台等）`max-w-5xl`。

### 5.5 Tailwind grid + divide 分割线

列分割时**外层禁止用全局 `p-*`**（会让分割线被截断），改为每个 cell 用 `py-*` + 外层 `overflow-hidden`。

### 5.6 单文件行数

- 单文件 ≤ **300 行**（超过必须拆分）
- JSX ≤ **80 行**（超过必须抽子组件）

---

## 六、常见工作流速查

### 6.1 新增功能

1. 读 `产品设计文档.md` 确认功能定位；视觉规范读 §五
2. 如需改 DB：新增 Flyway `V{N}__xxx.sql`（禁止改写已执行迁移）
3. 实现：后端 Entity → Mapper → Service → Controller；前端 `services/` → `flows/`
4. 同步文档：架构/DB/API 改动 → `技术方案文档.md`；用户可感知功能 → `产品设计文档.md`
5. 验证：前端 `npm run build`；后端 `./mvnw test`（需 JDK 21）
6. Commit：类型前缀 + 简要中文描述（≤ 50 字），每次只做一件事

### 6.2 修复 Bug

1. 定位根因（先 grep，再读相关代码）
2. 分层修复：后端优先 Service 层，前端优先 `services/` 层
3. 同步文档（涉及行为/契约变化时）
4. Commit：`fix` 类型 + 简要描述

### 6.3 DB 索引优化

1. 盘点 `db/migration/` 中全部索引
2. 比对实际查询模式，识别冗余/缺漏/列序不当
3. 新增迁移调整（已执行迁移不可改写）
4. 同步 `技术方案文档.md` §6.3

### 6.4 启动 / 重启开发环境

```bash
./start-dev.sh      # 中间件 + 后端 + 前端
./stop-dev.sh       # 停止全部
```

访问：前端 `http://localhost:5173`、后端 `http://localhost:8080`、MinIO 控制台 `http://localhost:9001`。

---

## 七、验证检查清单

每次修改代码后自查：

- [ ] 命名符合规范（组件 PascalCase / 函数变量 camelCase / 常量 UPPER_SNAKE_CASE）
- [ ] 单文件 ≤ 300 行 / JSX ≤ 80 行
- [ ] 无 `any` / `@ts-ignore` / `console.log`
- [ ] 类型 import 使用 `import type`（Vite 白屏风险）
- [ ] 图片有 `loading="lazy"`（首屏首图除外）
- [ ] 列表 `key` 唯一（禁止 index 作 key，除非列表不变）
- [ ] 用户输入已前端校验
- [ ] 图标按钮有 `aria-label`
- [ ] 手机端（< 768px）和 PC 端（≥ 1280px）都正常显示
- [ ] 错误已处理（不吞错误），无重复代码（DRY）

**TypeScript 附加检查**：

- [ ] 无 `!` 非空断言（用条件判断）
- [ ] 单字母变量禁用（循环 `i` 除外）

**数据库附加检查**：

- [ ] 状态字段语义由 Java 枚举/常量维护，无魔法数字
- [ ] 新增/修改迁移已同步 `技术方案文档.md`，且未改写已执行版本

---

## 八、已知陷阱

| 陷阱 | 说明 | 规避 |
|---|---|---|
| 本机默认 JDK 8 | Spring Boot 3 依赖为 class version 61，`mvn` 直接报"类文件具有错误的版本" | 切 JDK 21：`export JAVA_HOME=$(/usr/libexec/java_home -v 21)` |
| `grid + divide-x + p-*` 分割线被截断 | 外层 padding 会让分割线不顶天立地 | cell 用 `py-*` + 外层 `overflow-hidden` |
| 迁移文件被改写 | Flyway 校验和会拒绝启动 | 结构修正一律新增 `V{N+1}`，参考 V4→V5 |
| 组件内自行处理 token | 刷新逻辑分散、易漏 401 重试 | 统一走 `services/http.ts`，组件不碰 token |
| MyBatis-Plus `selectOne` 多结果 | 登录标识可能命中多列（用户名/手机号/邮箱） | 用 `selectList` + 优先级筛选（参考 `AuthService.resolveByLoginIdentifier`） |

---

## 九、缺失配置（待补）

| 项 | 说明 | 建议 |
|---|---|---|
| 项目级 `.qoder/skills/` | 当前无专属 skill | 可沉淀「buyer-show-commit」（自动校验迁移与文档同步） |
| 项目级 `.qoder/hooks/` | 当前复用用户级 hooks | 可加项目级 pre-commit 校验（`tsc` + `oxlint`） |
| 后端集成测试 | 仅有单元测试（7 个测试类） | 用 H2/Testcontainers 覆盖发布与互动链路 |
| 生产配置加固 | 密钥与开发凭据需按环境注入 | 见 `产品设计文档.md` 待办 P1.8 |

---

## 十、AI 工具调用约定

当 AI 工具（Qoder / Claude / Cursor 等）接到本项目任务时：

1. **先读规范**：开工前读 `AGENTS.md`，按需读三份核心文档的相关章节
2. **先查现状**：用 `grep` / 文件搜索确认代码位置，避免重复造轮子
3. **按分层修改**：前端 `services/` → `flows/`；后端 Controller → Service → Mapper，**禁止组件内直接 fetch、禁止拼接 SQL**
4. **跑验证**：前端 `npm run build`；后端 `./mvnw test`（JDK 21）；两者必须通过
5. **同步文档**：按 `AGENTS.md` 文档同步规则更新 `技术方案文档.md` / `产品设计文档.md`（同一次 commit）
6. **按 feature 拆 commit**：类型前缀 + 简要中文描述（≤ 50 字），每次只做一件事
7. **不自动 push**：commit 完成后询问用户是否 `git push`

---

> 本文档随项目演进同步更新（最近对齐：2026-09 文档合并与真实 API 联调后）。
