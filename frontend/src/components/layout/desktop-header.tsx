// PC 端全局顶部导航：Stack 页常驻（首页用 Feed 自带导航；登录/管理后台为独立体系，不显示）
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, MessageCircle, Moon, Plus, Search, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import { getAccessToken, getTokenRole } from '@/services/http'

export function DesktopHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const visible = pathname !== '/' && pathname !== '/login' && !pathname.startsWith('/admin')
  if (!visible) return null

  const isLoggedIn = Boolean(getAccessToken())
  const isAdmin = getTokenRole() === 'ADMIN'
  const onMessages = pathname.startsWith('/messages') || pathname.startsWith('/notifications')
  const onProfile = pathname.startsWith('/profile') || pathname.startsWith('/user/')

  return (
    <header className="sticky top-0 z-50 hidden border-b border-border bg-card/95 backdrop-blur-xl md:block">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2" aria-label="返回首页">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold text-foreground">买家说</span>
        </button>
        <nav className="flex items-center gap-1" aria-label="频道导航">
          <Button variant={pathname === '/' ? 'secondary' : 'ghost'} size="sm" onClick={() => navigate('/')}>
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
          className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-full bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/80"
        >
          <Search className="h-4 w-4" />
          搜索好物、品牌、标签...
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Button aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'} variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/moderation')}>
              审核台
            </Button>
          )}
          <Button onClick={() => navigate('/publish')} className="h-9 rounded-full bg-coral px-4 text-white hover:bg-coral-dark">
            <Plus className="mr-1 h-4 w-4" />
            发布
          </Button>
          {isLoggedIn ? (
            <Button variant={onProfile ? 'secondary' : 'ghost'} size="sm" onClick={() => navigate('/profile')}>
              我的
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              登录
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
