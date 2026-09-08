# 买家说 — 项目代码规范

> 本文件是项目级强制规范，所有代码生成和修改必须遵守。
> 完整规范详见：`UI设计规范文档.md`、`技术开发规范.md`、`技术方案文档.md`、`架构设计文档.md`

---

## 项目概述

「买家说」是购物种草社区应用，采用**前后端分离 + Monorepo** 架构：
- `frontend/` — Web 前端（Vite + React + shadcn/ui + Tailwind CSS）
- `server/` — Java 后端（Spring Boot 3 + MyBatis-Plus + MySQL 8）
- `app/` — 移动端（uniapp X + Vue 3，待实现）

部署方式：Docker + Kubernetes。

---

## 技术栈约束

### 前端（frontend/）
- 构建：Vite 8
- 框架：React 19 + TypeScript 6
- 组件库：shadcn/ui
- 样式：Tailwind CSS 4
- 路由：react-router-dom
- 图标：lucide-react
- 状态管理：Zustand（全局 store ≤ 3 个）
- 包管理：npm

### 后端（server/）
- 框架：Spring Boot 3.3 + Java 21
- ORM：MyBatis-Plus
- 数据库：MySQL 8.0
- 缓存：Redis 7
- 搜索：Elasticsearch 8
- 消息队列：RabbitMQ 3.13
- 对象存储：MinIO / 阿里云 OSS
- 认证：Spring Security + JWT（双 token）
- API 文档：SpringDoc OpenAPI 3

### 部署
- 容器：Docker + Docker Compose（开发）
- 编排：Kubernetes + Helm 3（生产）
- CI/CD：GitHub Actions + ArgoCD
- 可观测：OpenTelemetry + Grafana Alloy + Prometheus + Loki + Tempo + Grafana（Pyroscope 可选）
- 日志：Logback 单行 JSON + trace_id/span_id；K8s stdout 为主，本地文件仅短期滚动缓冲

---

## 目录结构

```
buyer-show/
├── frontend/                    # Web 前端
│   ├── src/
│   │   ├── App.tsx              # 应用入口 + 路由
│   │   ├── main.tsx             # React 挂载
│   │   ├── index.css            # Tailwind + 主题 Token
│   │   ├── components/ui/       # shadcn/ui 组件
│   │   ├── lib/                 # 工具函数
│   │   └── flows/               # 业务 Flow
│   │       ├── shared/          # 共享类型 + mock 数据
│   │       ├── home-feed/       # 首页 Feed
│   │       ├── post-detail/     # 帖子详情
│   │       ├── publish-post/    # 发布分享
│   │       └── messages/        # 私信通知
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── server/                      # Java 后端
│   ├── src/main/java/com/buyershow/
│   │   ├── controller/          # REST 控制器
│   │   ├── service/             # 业务逻辑
│   │   ├── mapper/              # MyBatis-Plus Mapper
│   │   ├── entity/              # 数据库实体
│   │   ├── dto/                 # 请求/响应 DTO
│   │   ├── config/              # 配置类
│   │   ├── common/              # 公共模块（异常、安全、工具）
│   │   └── consumer/            # RabbitMQ 消费者
│   └── src/main/resources/
│       ├── application.yml
│       ├── mapper/              # MyBatis XML
│       └── db/migration/       # Flyway SQL 迁移
│
├── app/                         # 移动端（待实现）
│
├── docs/                        # 项目文档
│   └── assets/                  # logo 等资源
│
├── supabase/                    # 旧版迁移脚本（归档）
├── AGENTS.md                    # 本文件
├── CLAUDE.md                    # AI 编码规范
├── 架构设计文档.md               # 架构方案
├── 架构改进分析.md               # 竞品对标分析
├── 产品设计文档.md               # 产品功能定义
├── 技术方案文档.md               # 技术实现细节
├── UI设计规范文档.md             # UI 设计规范
├── 技术开发规范.md               # 编码规范
├── ui-prototype.html            # 移动端 UI 原型
└── README.md
```

---

## 前端规范

### TypeScript
- `strict: true`
- 数据模型用 `interface`，联合类型用 `type`
- **禁止 `any`**（用 `unknown` + 类型守卫）
- **禁止 `@ts-ignore`**（用 `?.` + `??`）
- 禁止非空断言 `!`（用条件判断）
- 类型 import 必须用 `import type`（防止 Vite 白屏）

### 组件设计
- 使用 shadcn/ui 组件，颜色用 Tailwind Token
- 品牌主色 `coral`（#FF6B35）已注册为 Tailwind 自定义色
- 组件内部顺序：类型定义 → Hooks → 事件处理 → 派生数据 → JSX
- 单文件不超过 **300 行**，JSX 超过 **80 行**拆子组件
- 事件处理函数用 `handle` 前缀，布尔变量用 `is/has/can/should` 前缀

### 状态管理
| 状态类型 | 存储 | 工具 |
|----------|------|------|
| UI 临时状态 | 组件内 | `useState` |
| 服务端数据 | React Query / SWR | 缓存 + 自动刷新 |
| 全局用户态 | Zustand | `useUserStore` |
| 全局 UI 态 | Zustand | `useUIStore` |
| 持久化 | localStorage | 自定义 Hook |

### API 调用
- 请求函数统一放 `services/`，按领域拆分
- 使用 ky 或 axios 封装 HTTP 客户端
- 自动处理 JWT token 刷新
- 统一错误处理 + Toast 提示

### 响应式断点
| 断点 | 宽度 | 布局 |
|------|------|------|
| Mobile | < 768px | 底部 TabBar、双列瀑布流 |
| Tablet | 768-1023px | 三列瀑布流 |
| Desktop | 1024-1279px | 顶部导航 + 三列 + 侧边栏 |
| Wide | ≥ 1280px | 四~五列 + 侧边栏 |

---

## 后端规范

### 分层架构
```
Controller → Service → Mapper → Database
     ↓           ↓
   DTO       Entity
```

- Controller：参数校验（JSR 380）+ 调用 Service + 返回统一响应
- Service：业务逻辑编排，事务管理
- Mapper：MyBatis-Plus CRUD + 自定义 SQL
- DTO：请求/响应数据传输对象
- Entity：数据库实体，对应表结构

### 统一响应
```java
public class R<T> {
    private int code;       // 0=成功，1xxx=业务错误
    private String message;
    private T data;
}
```

### 错误码规范
| 范围 | 模块 |
|------|------|
| 1000-1999 | 认证相关 |
| 2000-2999 | 用户相关 |
| 3000-3999 | 帖子相关 |
| 4000-4999 | 评论相关 |
| 5000-5999 | 上传相关 |
| 9000-9999 | 系统错误 |

### 数据库
- 使用 Flyway 管理迁移（`src/main/resources/db/migration/`），禁止直接修改已执行的迁移
- 表名小写下划线；关系表以 `_rela` 结尾；字段名小写下划线
- 状态字段用 `TINYINT`，语义由 Java 枚举维护
- 禁止数据库外键，Service 事务 + 唯一索引维护数据一致性
- 主业务表含创建/更新时间；纯关系表只要求创建时间
- 游标分页必须使用稳定唯一键；主 Feed 以自增 `id` 为游标并使用 `(status, id DESC)` 索引
- 索引必须来自实际 `WHERE / JOIN / ORDER BY` 查询模式，单表索引原则上不超过 5 个

---

## 设计系统 Token

| Token | 值 | 用途 |
|-------|-----|------|
| coral | `#FF6B35` | 品牌主色、CTA、选中态 |
| coral-light | `#FFF0E8` | 高亮背景 |
| warm-bg | `#FAF7F5` | 页面背景 |
| warm-100 | `#F5EDE8` | 卡片分隔 |
| 正文色 | `oklch(0.145 0 0)` | 标题、正文 |
| 辅助色 | `oklch(0.556 0 0)` | 描述、placeholder |

- 圆角：sm=4px, md=8px, lg=12px, xl=16px
- 间距基数 4px，所有间距为 4 的倍数
- 触控目标最小 44×44px

---

## Git 规范

- 分支：`main`(生产) / `dev`(集成) / `feature/*` / `fix/*`
- Commit：Conventional Commits，中文描述，subject ≤ 50 字
- 格式：`feat(scope): 描述` / `fix(scope): 描述`
- scope 可选：`frontend` / `server` / `app` / `infra` / `docs`
- 每次 commit 只做一件事

---

## 文档同步规则（强制）

| 改动类别 | 目标文档 |
|---------|---------|
| 架构调整、技术选型 | `架构设计文档.md` + `技术方案文档.md` |
| 新增/修改功能 | `产品设计文档.md` |
| UI 设计变更 | `UI设计规范文档.md` |
| 编码规范变更 | `AGENTS.md` + `CLAUDE.md` |

文档变更与代码变更**同一次 commit 内**完成。
