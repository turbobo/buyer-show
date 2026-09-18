import { create } from 'zustand'
import { getAccessToken } from '@/services/http'
import { getUnreadCount } from '@/services/notifications'

type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'buyer-show.theme'

// 竞态防护：只允许最后一次发起的刷新落地，防止旧响应覆盖新值
let refreshSeq = 0

interface UiStore {
  /** 未读通知数（各消息入口徽标共享的单一事实源） */
  unreadCount: number
  /** 从服务端拉取未读数；未登录时清零，失败时保持原值 */
  refreshUnreadCount: () => Promise<void>
  /** 本地直接置值（如全部已读后清零） */
  setUnreadCount: (count: number) => void
  /** 主题偏好（持久化到 localStorage） */
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

/**
 * 跨页 UI 状态（P4.2）：未读徽标 + 主题偏好。
 * 服务端数据一律走 TanStack Query 缓存；本 store 仅承载与数据请求无关的 UI 状态，
 * 解决此前多个入口各自轮询 / 各自持主题 state 导致的不一致。
 */
export const useUiStore = create<UiStore>((set, get) => ({
  unreadCount: 0,
  refreshUnreadCount: async () => {
    if (!getAccessToken()) {
      set({ unreadCount: 0 })
      return
    }
    const seq = ++refreshSeq
    try {
      const data = await getUnreadCount()
      // 复检 token：登出后清零，避免在途响应把徽标又设回去
      if (seq === refreshSeq && getAccessToken()) {
        set({ unreadCount: data.count ?? 0 })
      }
    } catch {
      /* 网络异常时保持原值 */
    }
  },
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  theme: (() => {
    if (typeof window === 'undefined') return 'system'
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
  })(),
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme)
    set({ theme })
  },
  toggleTheme: () => {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },
}))
