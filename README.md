# 买家说 · Buyer Show

购物种草社区全平台项目，前后端分离 Monorepo 架构。

## 项目结构

```
buyer-show/
├── frontend/          ← Web 前端（Vite + React + shadcn/ui + Tailwind CSS）✅
├── server/            ← Java 后端（Spring Boot 3 + MyBatis-Plus + MySQL）✅ 骨架
├── docker-compose.yml ← 全栈开发环境
├── docs/              ← 静态资源
├── supabase/          ← 旧版迁移脚本（归档）
└── *.md               ← 项目文档
```

## 快速开始

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

# 2. 启动后端
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
| Web 前端 | Vite 8 + React 19 + shadcn/ui + Tailwind CSS 4 | ✅ 4 Flow |
| Java 后端 | Spring Boot 3.3 + MyBatis-Plus + Java 21 | ✅ 骨架 |
| 数据库 | MySQL 8.0 + Flyway 迁移 | ✅ Schema |
| 缓存 | Redis 7 | 🔲 待接入 |
| 搜索 | Elasticsearch 8 | 🔲 待接入 |
| 消息队列 | RabbitMQ 3.13 | 🔲 待接入 |
| 对象存储 | MinIO / 阿里云 OSS | 🔲 待接入 |
| 移动端 | uniapp X + Vue 3 | 🔲 待实现 |

## API 端点

```
POST   /api/v1/auth/register         注册
POST   /api/v1/auth/login            登录
POST   /api/v1/auth/refresh          刷新 token
GET    /api/v1/posts                  Feed（游标分页）
GET    /api/v1/posts/:id              帖子详情
POST   /api/v1/posts                  发布
DELETE /api/v1/posts/:id              删除
POST   /api/v1/posts/:id/like        点赞
POST   /api/v1/posts/:id/favorite    收藏
GET    /api/v1/health                 健康检查
```

## 品牌设计

- 主色：珊瑚红 `#FF6B35`
- 背景：暖白 `#FAF7F5`
- 字体：Noto Sans SC
- 圆角：卡片 16px / 按钮 12px / 药丸 full
