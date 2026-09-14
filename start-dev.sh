#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# JDK 21 检测（Spring Boot 3 必需；本机 brew 安装路径优先）
if [ -z "${JAVA_HOME:-}" ] || ! "$JAVA_HOME/bin/java" -version 2>&1 | grep -q 'version "21'; then
  for candidate in \
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
    "$(/usr/libexec/java_home -v 21 2>/dev/null || true)"; do
    if [ -n "$candidate" ] && [ -x "$candidate/bin/java" ]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi
if [ -z "${JAVA_HOME:-}" ] || ! "$JAVA_HOME/bin/java" -version 2>&1 | grep -q 'version "21'; then
  echo "❌ 未找到 JDK 21（Spring Boot 3 必需）。安装：brew install openjdk@21"
  exit 1
fi
export PATH="$JAVA_HOME/bin:$PATH"
echo "☕ 使用 JDK: $JAVA_HOME"

# Docker 运行时检测（macOS 使用 Colima）
if ! docker info >/dev/null 2>&1; then
  if command -v colima >/dev/null 2>&1; then
    echo "🐳 Docker 运行时未启动，正在启动 Colima..."
    colima start
  else
    echo "❌ Docker 运行时不可用。macOS 可安装 Colima：brew install colima docker"
    exit 1
  fi
fi

echo "🚀 启动买家说开发环境..."
echo ""

# 1. 启动中间件
echo "📦 [1/5] 启动中间件（MySQL + Redis + ES + RabbitMQ + MinIO）..."
cd "$PROJECT_DIR"
docker compose up -d mysql redis elasticsearch rabbitmq minio

# 2. 等待 MySQL 就绪
echo "⏳ [2/5] 等待 MySQL 就绪..."
for i in $(seq 1 30); do
  if docker compose exec -T mysql mysqladmin ping -u app -pdevpassword --silent 2>/dev/null; then
    echo "   ✅ MySQL 就绪"
    break
  fi
  if [ "$i" = "30" ]; then
    echo "   ❌ MySQL 启动超时"
    exit 1
  fi
  sleep 2
done

# 3. 启动后端
echo "🔧 [3/5] 启动 Spring Boot 后端..."
cd "$PROJECT_DIR/server"
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xmx512m" > /tmp/buyershow-api.log 2>&1 &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"
echo "   日志: tail -f /tmp/buyershow-api.log"

# 4. 等待后端就绪
echo "⏳ [4/5] 等待后端就绪（首次启动约 30-60 秒）..."
for i in $(seq 1 60); do
  if curl -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ 后端就绪"
    break
  fi
  if [ "$i" = "60" ]; then
    echo "   ⚠️ 后端启动较慢，请检查日志: tail -f /tmp/buyershow-api.log"
  fi
  sleep 3
done

# 5. 启动前端
echo "🎨 [5/5] 启动 Vite 前端..."
cd "$PROJECT_DIR/frontend"
npm run dev > /tmp/buyershow-web.log 2>&1 &
FRONTEND_PID=$!
echo "   前端 PID: $FRONTEND_PID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 全部启动完成！"
echo ""
echo "   🌐 前端:     http://localhost:5173"
echo "   🔧 后端:     http://localhost:8080"
echo "   📖 Swagger:  http://localhost:8080/swagger-ui.html"
echo "   🗄️  MySQL:    localhost:3306 (app/devpassword)"
echo "   📮 Redis:    localhost:6379"
echo "   🔍 ES:       http://localhost:9200"
echo "   🐰 RabbitMQ: http://localhost:15672 (app/devpassword)"
echo "   📦 MinIO:    http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "   停止: bash $PROJECT_DIR/stop-dev.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 保持前台，Ctrl+C 停止
trap "echo '正在停止...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; cd $PROJECT_DIR && docker compose down; echo '已停止'" EXIT
wait
