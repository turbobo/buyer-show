import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { ToastProvider } from './components/ui/toast'
import { startAutoFlush } from './services/analytics'
import { initPerformanceMonitoring } from './services/performance'
import { initErrorMonitoring } from './services/error-monitoring'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

// 服务端状态缓存（P4.1）：去重、共享、精准失效；窗口聚焦不自动重拉（保持现状行为）
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// 初始化监控服务（Sentry 懒加载：无 DSN 时不请求 SDK）
void initErrorMonitoring()
initPerformanceMonitoring()

// Start analytics auto-flush
startAutoFlush()

// Flush remaining events before page unload
window.addEventListener('beforeunload', () => {
  import('./services/analytics').then(({ flush }) => {
    flush()
  })
})

// 发版后旧页面引用的懒加载 chunk 可能已失效（资源哈希变化）→ 自动刷新一次获取新版本
const CHUNK_RELOAD_KEY = 'buyer-show.chunk-reload-at'
window.addEventListener('vite:preloadError', (event: Event) => {
  event.preventDefault()
  const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0)
  if (Date.now() - lastReloadAt > 10_000) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
    window.location.reload()
  }
})

// Service Worker 新版本接管时自动刷新一次，避免已打开的旧页面长期停留在缓存版本
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let isRefreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isRefreshing) return
    isRefreshing = true
    window.location.reload()
  })
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
