// PC 端全局顶部导航：Stack 页常驻（首页用 Feed 自带导航；登录/管理后台为独立体系，不显示）
// 菜单规格与 Feed 顶部导航完全一致：logo · 🏠首页 · 💬消息 · 搜索 · 主题 · 审核台 · 发布 · 用户区(头像下拉：我的主页/编辑资料/退出)
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Moon, Plus, Search, Sun } from 'lucide-react'
import { CHANNELS, PC_CHANNEL_ORDER, isChannelActive } from '@/lib/navigation'
import { Button } from '@/components/ui/button'
import { UserMenu } from './user-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useTheme } from '@/hooks/use-theme'
import { useToast } from '@/components/ui/toast'
import { useUnreadCount } from '@/hooks/use-unread-count'
import { clearTokens, getAccessToken, getTokenRole } from '@/services/http'
import { getCurrentUserProfile, type UserProfile } from '@/services/auth'

export function DesktopHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // 登录态同步：随路由变化重新获取（Header 常驻 App 层，登录/登出后不会重新挂载）
  useEffect(() => {
    if (!getAccessToken()) {
      setCurrentUser(null)
      return
    }
    getCurrentUserProfile()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null))
  }, [pathname])

  // 登出确认弹窗：Esc 关闭
  useEffect(() => {
    if (!showLogoutConfirm) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowLogoutConfirm(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showLogoutConfirm])

  const visible = pathname !== '/' && pathname !== '/login' && !pathname.startsWith('/admin')
  const unreadCount = useUnreadCount()
  if (!visible) return null

  const isAdmin = getTokenRole() === 'ADMIN'

  const handleConfirmLogout = () => {
    setIsLoggingOut(true)
    clearTokens()
    setCurrentUser(null)
    setIsLoggingOut(false)
    setShowLogoutConfirm(false)
    toast('success', '已退出登录')
    navigate('/')
  }

  return (
    <>
      <header className="sticky top-0 z-[55] hidden border-b border-border bg-card/95 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <button type="button" onClick={() => navigate('/')} className="flex shrink-0 items-center gap-2" aria-label="返回首页">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <span className="text-lg font-bold text-foreground">买家说</span>
          </button>
          <nav className="flex shrink-0 items-center gap-1" aria-label="频道导航">
            {PC_CHANNEL_ORDER.map((key) => {
              const channel = CHANNELS[key]
              const Icon = channel.icon
              const active = isChannelActive(key, pathname)
              return (
                <Button
                  key={key}
                  variant={active ? 'secondary' : 'ghost'}
                  size="sm"
                  className="relative"
                  onClick={() => navigate(channel.to)}
                >
                  <Icon className="mr-1 h-4 w-4" />
                  {channel.label}
                  {key === 'messages' && unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              )
            })}
          </nav>
          <button
            type="button"
            onClick={() => navigate('/?focus=search')}
            className="mx-auto flex h-10 max-w-xl flex-1 items-center gap-2 rounded-full bg-muted/50 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted/80"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">搜索好物、品牌、标签...</span>
          </button>
          {/* 右操作区双层分组（16/8）：工具组（主题/审核台） | 操作组（发布+身份区） */}
          <div className="ml-auto flex shrink-0 items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/moderation')}>
                  审核台
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                aria-label="发布分享"
                onClick={() => navigate('/publish')}
                className="h-10 rounded-full bg-coral px-3 text-white hover:bg-coral-dark sm:px-4"
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span>发布</span>
              </Button>
              {currentUser ? (
                <UserMenu user={currentUser} onLogoutRequest={() => setShowLogoutConfirm(true)} />
              ) : (
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  登录
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── 登出二次确认（U34：统一 ConfirmDialog） ─── */}
      <ConfirmDialog
        open={showLogoutConfirm}
        title="退出登录？"
        description="退出后将以游客身份浏览，随时可以重新登录。"
        confirmText="退出登录"
        destructive
        isSubmitting={isLoggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  )
}
