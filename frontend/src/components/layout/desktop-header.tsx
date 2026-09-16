// PC 端全局顶部导航：Stack 页常驻（首页用 Feed 自带导航；登录/管理后台为独立体系，不显示）
// 菜单规格与 Feed 顶部导航完全一致：logo · 🏠首页 · 💬消息 · 搜索 · 主题 · 审核台 · 发布 · 用户区(头像下拉：我的主页/编辑资料/退出)
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, MessageCircle, Moon, Plus, Search, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserMenu } from './user-menu'
import { useTheme } from '@/hooks/use-theme'
import { useToast } from '@/components/ui/toast'
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
  if (!visible) return null

  const isAdmin = getTokenRole() === 'ADMIN'
  const onMessages = pathname.startsWith('/messages') || pathname.startsWith('/notifications')

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
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <Home className="mr-1 h-4 w-4" />
              首页
            </Button>
            <Button variant={onMessages ? 'secondary' : 'ghost'} size="sm" onClick={() => navigate('/messages')}>
              <MessageCircle className="mr-1 h-4 w-4" />
              消息
            </Button>
          </nav>
          <button
            type="button"
            onClick={() => navigate('/?focus=search')}
            className="mx-auto flex h-10 max-w-xl flex-1 items-center gap-2 rounded-full bg-muted/50 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted/80"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">搜索好物、品牌、标签...</span>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-2">
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
            <Button
              aria-label="发布分享"
              onClick={() => navigate('/publish')}
              className="h-9 rounded-full bg-coral px-3 text-white hover:bg-coral-dark sm:px-4"
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
      </header>

      {/* ─── 登出二次确认 ─── */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="退出登录确认"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">退出登录？</h3>
            <p className="mt-2 text-sm text-muted-foreground">退出后将以游客身份浏览，随时可以重新登录。</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" autoFocus disabled={isLoggingOut} onClick={() => setShowLogoutConfirm(false)}>
                取消
              </Button>
              <Button variant="destructive" disabled={isLoggingOut} onClick={handleConfirmLogout}>
                {isLoggingOut ? '退出中...' : '退出登录'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
