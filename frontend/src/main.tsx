import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ToastProvider } from './components/ui/toast'
import { startAutoFlush } from './services/analytics'
import { initPerformanceMonitoring } from './services/performance'
import { initErrorMonitoring } from './services/error-monitoring'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

// 初始化监控服务
initErrorMonitoring()
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
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
