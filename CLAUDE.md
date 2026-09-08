# 买家说 — AI 编码规范

> **所有代码生成和修改必须遵守本文件及项目规范文档。**

---

## 技术栈（锁定版本）

### 前端 frontend/
- Vite 8 + React 19 + TypeScript 6
- shadcn/ui 组件库
- Tailwind CSS 4（`@import "tailwindcss"` + `@theme` Token）
- react-router-dom（路由）
- lucide-react（图标）
- Zustand（状态管理）

### 后端 server/
- Spring Boot 3.3 + Java 21
- MyBatis-Plus（ORM）
- MySQL 8.0 + Redis 7
- Elasticsearch 8 + RabbitMQ 3.13
- Spring Security + JWT
- Flyway（数据库迁移）

---

## 强制规则

### 前端 TypeScript
- **禁止 `any`**（用 `unknown` + 类型守卫）
- **禁止 `@ts-ignore`**（用 `?.` + `??`）
- 禁止非空断言 `!`（用条件判断）
- 类型 import 必须用 `import type`（防止 Vite esbuild 白屏）
- 混合 import 拆两行：`import type { X } from './types'` + `import { fn } from './api'`

### 前端组件
- 使用 shadcn/ui 组件（`@/components/ui/`）
- 颜色用 Tailwind Token（`bg-coral`、`text-muted-foreground`），禁止硬编码
- 单文件 ≤ **300 行**，JSX ≤ **80 行**
- 事件处理用 `handle` 前缀，布尔变量用 `is/has/can/should` 前缀

### 后端 Java
- 遵循阿里巴巴 Java 开发规范
- Controller 只做参数校验 + 调用 Service
- Service 处理业务逻辑 + 事务管理
- 统一响应 `R<T>`（code + message + data）
- 异常统一抛 `BusinessException`，由 `GlobalExceptionHandler` 捕获

### 数据库
- Flyway 迁移文件：`V{N}__{description}.sql`，已执行版本禁止改写
- 状态字段用 `TINYINT` + Java 枚举
- 禁止数据库外键；Service 事务 + 唯一索引维护关系一致性
- 主业务表含创建/更新时间，关系表只要求创建时间
- 游标分页必须使用稳定联合游标（如 `created_at + id`）及对应联合索引
- 计数器必须用原子 SQL 自增/自减，禁止先读后写
- 禁止直接改线上数据库，必须走迁移

### 样式
- 品牌主色 `coral`（#FF6B35）
- 页面背景 `warm-bg`（#FAF7F5）
- 间距基数 4px
- 移动端优先，断点：默认(<768) / md:(≥768) / lg:(≥1024) / xl:(≥1280)

---

## 工作流程

### 新增功能
1. 读 `产品设计文档.md` 确认功能定位
2. 读 `UI设计规范文档.md` 确认视觉规范
3. 后端：Entity → Mapper → Service → Controller
4. 前端：types → services → hooks → components → pages
5. 同步文档
6. 验证：前端 `npm run build` 通过，后端 `mvn verify` 通过
7. Commit：`feat(scope): 描述`

### 修复 Bug
1. 定位根因
2. 在对应层修复（后端优先 Service 层，前端优先 services 层）
3. 同步文档
4. Commit：`fix(scope): 描述`

---

## 安全
- 禁止 `dangerouslySetInnerHTML`
- 禁止硬编码密钥
- 用户输入必须前后端双重校验
- 生产代码禁止 `console.log`

## 性能
- 图片 `loading="lazy"`（首屏首图除外）
- 搜索防抖 300ms
- 禁止引入整个 lodash / moment.js

## Git Commit
```
feat(frontend): 描述
fix(server): 描述
refactor(app): 描述
```
scope: `frontend` / `server` / `app` / `infra` / `docs`
