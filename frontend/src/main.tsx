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

createRoot(rootElement).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
