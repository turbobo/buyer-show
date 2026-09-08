#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🛑 停止买家说开发环境..."

# 停止后端和前端进程
pkill -f "spring-boot:run" 2>/dev/null && echo "   ✅ 后端已停止" || echo "   后端未运行"
pkill -f "vite.*buyer-show" 2>/dev/null && echo "   ✅ 前端已停止" || echo "   前端未运行"

# 停止 Docker 中间件
cd "$PROJECT_DIR"
docker compose down && echo "   ✅ 中间件已停止"

echo "✅ 全部已停止"
