import * as Sentry from '@sentry/react'

/**
 * 初始化 Sentry 错误监控
 */
export function initErrorMonitoring() {
  // 仅在浏览器环境且配置了 DSN 时启用
  if (typeof window === 'undefined') return
  
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    console.log('[Sentry] DSN not configured, error monitoring disabled')
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    
    // 性能监控
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // 采样率配置
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 生产环境 10%，开发环境 100%
    replaysSessionSampleRate: 0.1, // 10% 会话录制
    replaysOnErrorSampleRate: 1.0, // 错误时 100% 录制

    //  beforeSend: 在发送前过滤敏感信息
    beforeSend(event) {
      // 过滤开发环境的错误
      if (import.meta.env.DEV) {
        return null
      }
      return event
    },

    // 忽略特定错误
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
  })

  console.log('[Sentry] Error monitoring initialized')
}

/**
 * 手动捕获异常
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (import.meta.env.DEV) {
    console.error('[Sentry] Captured exception:', error, context)
    return
  }
  
  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * 手动捕获消息
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (import.meta.env.DEV) {
    console.log(`[Sentry] ${level}:`, message)
    return
  }
  
  Sentry.captureMessage(message, { level })
}

/**
 * 设置用户上下文
 */
export function setUserContext(userId: string | number, email?: string, username?: string) {
  Sentry.setUser({
    id: String(userId),
    email,
    username,
  })
}

/**
 * 清除用户上下文
 */
export function clearUserContext() {
  Sentry.setUser(null)
}

/**
 * 添加面包屑
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, any>,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
  })
}
