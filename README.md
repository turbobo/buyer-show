# 买家说 · Buyer Show

购物种草社区全平台项目，前后端分离 Monorepo 架构。

## 项目结构

```
buyer-show/
├── frontend/          ← Web 前端（Vite 8 + React 19 + shadcn/ui + Tailwind CSS 4）
├── server/            ← Java 后端（Spring Boot 3.3 + MyBatis-Plus + MySQL 8）
├── app/               ← 移动端 uniapp X（待实现）
├── docker-compose.yml ← 全栈开发环境
├── start-dev.sh / stop-dev.sh ← 一键启动/停止开发环境
├── docs/assets/       ← logo 等静态资源
├── ui-prototype.html  ← 移动端 UI 原型（15 屏）
└── *.md               ← 项目文档（见下方「文档索引」）
```

## 快速开始

### 一键启动（推荐）

> 前置：Docker 运行时已启动（macOS 使用 Colima：`colima start`，详见《技术方案文档》§7.2）

```bash
./start-dev.sh     # 启动中间件 + 后端 + 前端
./stop-dev.sh      # 停止全部
```

### 前端开发

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 后端开发

```bash
# 1. 启动基础设施
docker compose up -d mysql redis

# 2. 启动后端（自动执行 Flyway 迁移）
cd server
mvn spring-boot:run
# → http://localhost:8080
# → Swagger UI: http://localhost:8080/swagger-ui.html
```

### 全栈 Docker

```bash
docker compose up --build
# Web  → http://localhost:3000
# API  → http://localhost:8080
# MySQL → localhost:3306
# Redis → localhost:6379
```

## 技术栈

| 层 | 技术 | 状态 |
|----|------|------|
| Web 前端 | Vite 8 + React 19 + shadcn/ui + Tailwind CSS 4 | ✅ 6 Flow（含认证与审核台） |
| Java 后端 | Spring Boot 3.3 + MyBatis-Plus + Java 21 | ✅ 核心 API 已实现 |
| 数据库 | MySQL 8.0 + Flyway 迁移（V1-V5） | ✅ 已执行验证 |
| 对象存储 | MinIO（图片上传，pending→published） | ✅ 已接入 |
| 缓存 | Redis 7 | 🔲 待接入 |
| 搜索 | Elasticsearch 8 | 🔲 待接入 |
| 消息队列 | RabbitMQ 3.13 | 🔲 待接入 |
| 移动端 | uniapp X + Vue 3 | 🔲 待实现 |

## 核心 API（部分）

```
POST   /api/v1/auth/{register,login,refresh}   注册 / 登录 / 刷新 token
GET    /api/v1/posts                           Feed（游标分页 + 标签）
GET    /api/v1/posts/:id                       帖子详情
POST   /api/v1/posts                           发布（含内容审核）
POST   /api/v1/posts/:id/{like,favorite}       点赞 / 收藏
GET    /api/v1/posts/:postId/comments          评论列表
POST   /api/v1/reports                         举报
POST   /api/v1/upload/image                    图片上传
GET    /api/v1/admin/moderation/{posts,comments} 管理员待审队列
GET    /api/v1/health                          健康检查
```

> 完整 API 契约（含实现状态）见《技术方案文档》§5.5。

## 文档索引

| 文档 | 内容 |
|------|------|
| [产品设计文档](产品设计文档.md) | 产品定位、功能范围、UI 设计规范、代办事项 |
| [技术方案文档](技术方案文档.md) | 技术栈、系统结构、数据库、API 契约、部署与运行手册 |
| [架构设计文档](架构设计文档.md) | 目标态架构、中间件与可观测性设计、竞品对标与演进路线 |
| [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) | AI 编码规范（项目级强制） |
| ui-prototype.html | 移动端 UI 原型（浏览器打开查看 15 屏） |

## 品牌设计

- 主色：珊瑚红 `#FF6B35`
- 背景：暖白 `#FAF7F5`
- 字体：Noto Sans SC / PingFang SC
- 圆角：卡片 16px / 按钮 12px / 药丸 full
