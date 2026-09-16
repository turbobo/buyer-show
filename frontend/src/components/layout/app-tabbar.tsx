// 底部 TabBar（移动端）：一级频道常驻导航
// 显示于 Stack 页（主页/列表/消息等）；沉浸页与独立体系页隐藏（详情、发布、登录、管理后台）
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, MessageCircle, Plus, Search, User as UserIcon } from 'lucide-react'

const TABS = [
  { key: 'home', icon: Home, label: '首页' },
  { key: 'search', icon: Search, label: '搜索' },
  { key: 'publish', icon: Plus, label: '发布' },
  { key: 'messages', icon: MessageCircle, label: '消息' },
  { key: 'profile', icon: UserIcon, label: '我的' },
] as const

type TabKey = (typeof TABS)[number]['key']

// 隐藏规则：首页（Feed 自带 TabBar）、详情/编辑帖（沉浸）、发布（表单）、登录、管理后台
const HIDDEN_PREFIXES = ['/posts', '/publish', '/login', '/admin']

function resolveActive(pathname: string): TabKey | null {
  if (pathname.startsWith('/messages') || pathname.startsWith('/notifications')) return 'messages'
  if (pathname.startsWith('/profile')) return 'profile'
  return null
}

export function AppTabBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const visible = pathname !== '/' && !HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (!visible) return null

  const active = resolveActive(pathname)

  const handleClick = (key: TabKey) => {
    if (key === 'search') {
      // 移动端搜索入口：回首页并聚焦搜索框
      navigate('/?focus=search')
      return
    }
    const target = key === 'home' ? '/' : key === 'publish' ? '/publish' : key === 'messages' ? '/messages' : '/profile'
    if (pathname === target) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    navigate(target)
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
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-transform active:scale-90 ${
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
