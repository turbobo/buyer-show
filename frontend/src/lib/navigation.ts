// 导航单一配置源（U35）：一级频道与 PC 菜单顺序约定。
// DesktopHeader / AppTabBar / Feed 导航均从此读取；新增或调整频道只需改本文件。
import { Home, MessageCircle, Plus, Search, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type ChannelKey = 'home' | 'search' | 'publish' | 'messages' | 'profile'

export interface Channel {
  key: ChannelKey
  label: string
  to: string
  icon: LucideIcon
}

/** 一级频道定义 */
export const CHANNELS: Record<ChannelKey, Channel> = {
  home: { key: 'home', label: '首页', to: '/', icon: Home },
  search: { key: 'search', label: '搜索', to: '/?focus=search', icon: Search },
  publish: { key: 'publish', label: '发布', to: '/publish', icon: Plus },
  messages: { key: 'messages', label: '消息', to: '/messages', icon: MessageCircle },
  profile: { key: 'profile', label: '我的', to: '/profile', icon: User },
}

/** 移动端 TabBar 频道顺序 */
export const TABBAR_ORDER: ChannelKey[] = ['home', 'search', 'publish', 'messages', 'profile']

/**
 * PC 频道按钮顺序（Feed 导航 ≡ DesktopHeader，硬规范：菜单一致性）。
 * 完整菜单项顺序：[logo][首页][消息][搜索][主题][审核台][发布][用户区]——发布 CTA 固定于身份区左侧。
 */
export const PC_CHANNEL_ORDER: ChannelKey[] = ['home', 'messages']

/** 频道高亮判定 */
export function isChannelActive(key: ChannelKey, pathname: string): boolean {
  switch (key) {
    case 'home':
      return pathname === '/'
    case 'messages':
      return pathname.startsWith('/messages') || pathname.startsWith('/notifications')
    case 'profile':
      return pathname.startsWith('/profile')
    default:
      return false
  }
}
