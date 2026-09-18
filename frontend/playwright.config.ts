import { defineConfig, devices } from '@playwright/test'

/**
 * 浏览器级 E2E（P2.1-补充）：核心旅程黑盒验证。
 *
 * 运行前提（本地 dev 环境）：
 *   1. 后端与中间件在跑（仓库根 `./start-dev.sh`，或 docker compose 常驻栈）
 *   2. `npx playwright install chromium chromium-headless-shell`
 * 运行：npm run test:e2e
 *
 * 结构：global-setup 经 API + Redis 验证码明文注册唯一测试账号并登录，
 * 登录态写入 storageState（localStorage token），各 spec 共享，无验证码干扰。
 * 定位：本地质量资产（需完整中间件栈，不接云构建 CI）。
 */
export default defineConfig({
  testDir: './e2e/specs',
  timeout: 30_000,
  // E2E 串行执行：避免测试账号数据互相竞争
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5273',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/storage.json',
      },
    },
  ],
  // 专用端口启动 vite dev（5173 留给日常开发；/api 经 vite proxy 转发到后端 8080）
  webServer: {
    command: 'npm run dev -- --port 5273 --strictPort',
    url: 'http://localhost:5273',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
