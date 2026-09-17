// 底部 TabBar（移动端）：一级频道常驻导航（U35：频道定义读自 lib/navigation.ts）
// 显示于 Stack 页（主页/列表/消息等）；沉浸页与独立体系页隐藏（详情、发布、登录、管理后台）
import { useLocation, useNavigate } from 'react-router-dom'
import { CHANNELS, TABBAR_ORDER, isChannelActive, type ChannelKey } from '@/lib/navigation'
import { useUnreadCount } from '@/hooks/use-unread-count'

const TABS = TABBAR_ORDER.map((key) => CHANNELS[key])

type TabKey = ChannelKey

// 隐藏规则：首页（Feed 自带 TabBar）、详情/编辑帖（沉浸）、发布（表单）、登录、管理后台
const HIDDEN_PREFIXES = ['/posts', '/publish', '/login', '/admin']

function resolveActive(pathname: string): TabKey | null {
  for (const key of TABBAR_ORDER) {
    if (isChannelActive(key, pathname)) return key
  }
  return null
}

export function AppTabBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const unreadCount = useUnreadCount()

  const visible = pathname !== '/' && !HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (!visible) return null

  const active = resolveActive(pathname)

  const handleClick = (key: TabKey) => {
    const channel = CHANNELS[key]
    if (pathname === channel.to) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    navigate(channel.to)
  }

  return (
    <>
      {/* 占位：避免页面内容被固定 TabBar 遮挡 */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center border-t border-border bg-card/95 backdrop-blur-lg safe-bottom md:hidden">
        {TABS.map((tab) => {
          const isActive = active === tab.key
          const Icon = tab.icon
          const isPublish = tab.key === 'publish'
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleClick(tab.key)}
              className={`relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 transition-transform active:scale-90 ${
                isPublish ? '' : isActive ? 'text-coral' : 'text-muted-foreground'
              }`}
            >
              {isPublish ? (
                <div className="flex h-10 w-10 -mt-2 items-center justify-center rounded-full bg-coral text-white shadow-lg shadow-coral/25">
                  <Icon className="h-5 w-5" />
                </div>
              ) : (
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
              )}
              <span className={`text-[10px] ${isPublish ? 'text-coral font-medium' : ''}`}>{tab.label}</span>
              {tab.key === 'messages' && unreadCount > 0 && (
                <span className="absolute left-1/2 top-1.5 flex h-4 min-w-4 -translate-x-1 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {isActive && !isPublish && (
                <span className="absolute bottom-1.5 h-0.5 w-5 rounded-full bg-coral" />
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
