// 未读通知数：路由变化时刷新 + 15s 轮询（页面隐藏时暂停）+ 已读事件即时同步（仅登录态；多个消息入口共用）
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getAccessToken } from '@/services/http'
import { getUnreadCount } from '@/services/notifications'

/** 通知已读后广播此事件，各入口徽标即时刷新。 */
export const NOTIFICATIONS_UPDATED_EVENT = 'buyer-show:notifications-updated'

export function useUnreadCount(): number {
  const [count, setCount] = useState(0)
  const { pathname } = useLocation()

  useEffect(() => {
    if (!getAccessToken()) {
      setCount(0)
      return
    }
    let cancelled = false
    const fetchCount = () => {
      // 页面隐藏时跳过轮询，恢复可见时由 visibilitychange 立即补一次
      if (document.hidden) return
      getUnreadCount()
        .then((data) => {
          if (!cancelled) setCount(data.count ?? 0)
        })
        .catch(() => { /* 网络异常时保持原值 */ })
    }
    fetchCount()
    const timer = window.setInterval(fetchCount, 15000)
    const handleVisibility = () => { if (!document.hidden) fetchCount() }
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, fetchCount)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, fetchCount)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [pathname])

  return count
}
