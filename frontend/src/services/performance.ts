import { onCLS, onFID, onLCP, onTTFB, onINP } from 'web-vitals'
import { request } from './http'

interface PerformanceMetrics {
  cls?: number // Cumulative Layout Shift
  fid?: number // First Input Delay
  lcp?: number // Largest Contentful Paint
  ttfb?: number // Time to First Byte
  inp?: number // Interaction to Next Paint
  url: string
  timestamp: number
}

/**
 * 收集并上报 Web Vitals 性能指标
 */
export function initPerformanceMonitoring() {
  // 仅在浏览器环境运行
  if (typeof window === 'undefined') return

  const metrics: Partial<PerformanceMetrics> = {
    url: window.location.href,
    timestamp: Date.now(),
  }

  // Cumulative Layout Shift (CLS) - 布局偏移
  onCLS((metric) => {
    metrics.cls = metric.value
    console.log('[Performance] CLS:', metric.value)
    reportMetrics(metrics)
  })

  // First Input Delay (FID) - 首次输入延迟
  onFID((metric) => {
    metrics.fid = metric.value
    console.log('[Performance] FID:', metric.value, 'ms')
    reportMetrics(metrics)
  })

  // Largest Contentful Paint (LCP) - 最大内容绘制
  onLCP((metric) => {
    metrics.lcp = metric.value
    console.log('[Performance] LCP:', metric.value, 'ms')
    reportMetrics(metrics)
  })

  // Time to First Byte (TTFB) - 首字节时间
  onTTFB((metric) => {
    metrics.ttfb = metric.value
    console.log('[Performance] TTFB:', metric.value, 'ms')
    reportMetrics(metrics)
  })

  // Interaction to Next Paint (INP) - 交互到下次绘制
  onINP((metric) => {
    metrics.inp = metric.value
    console.log('[Performance] INP:', metric.value, 'ms')
    reportMetrics(metrics)
  })
}

/**
 * 上报性能指标到后端
 */
async function reportMetrics(metrics: Partial<PerformanceMetrics>) {
  try {
    await request('/analytics/performance', {
      method: 'POST',
      body: JSON.stringify(metrics),
    })
  } catch (error) {
    console.error('[Performance] Failed to report metrics:', error)
  }
}

/**
 * 获取性能等级描述
 */
export function getPerformanceRating(metric: 'cls' | 'fid' | 'lcp' | 'inp', value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = {
    cls: { good: 0.1, poor: 0.25 },
    fid: { good: 100, poor: 300 },
    lcp: { good: 2500, poor: 4000 },
    inp: { good: 200, poor: 500 },
  }

  const threshold = thresholds[metric]
  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}
