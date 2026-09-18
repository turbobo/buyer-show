// 未读通知数：订阅 ui-store 的单一事实源（轮询由 App 根组件 UnreadCountPoller 全局统一驱动）
import { useUiStore } from '@/stores/ui-store'

export function useUnreadCount(): number {
  return useUiStore((s) => s.unreadCount)
}
