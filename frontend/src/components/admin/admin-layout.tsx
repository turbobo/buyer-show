import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, FileCheck2, Flag, Gavel, Menu, ScrollText, ShieldCheck, Tags, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavItem {
  to: string
  label: string
  icon: typeof BarChart3
  enabled: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/analytics', label: '数据看板', icon: BarChart3, enabled: true },
  { to: '/admin/moderation', label: '内容审核', icon: FileCheck2, enabled: true },
  { to: '/admin/reports', label: '举报中心', icon: Flag, enabled: true },
  { to: '/admin/appeals', label: '申诉处理', icon: Gavel, enabled: true },
  { to: '/admin/users', label: '用户管理', icon: Users, enabled: true },
  { to: '/admin/tags', label: '标签管理', icon: Tags, enabled: true },
  { to: '/admin/audit-log', label: '审计日志', icon: ScrollText, enabled: true },
]

/**
 * 管理后台独立布局：桌面常驻侧栏，移动端折叠为抽屉；顶栏展示当前页与身份标识。
 * 路由守卫由 App.tsx 的 AdminRoute 承担。
 */
export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const current = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <ShieldCheck className="h-5 w-5 text-coral" />
        <span className="font-bold text-foreground">管理后台</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="后台导航">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          if (!item.enabled) {
            return (
              <div
                key={item.to}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/60"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px]">即将上线</span>
              </div>
            )
          }
          const active = location.pathname.startsWith(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setIsDrawerOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-coral-light text-coral'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-3">
        <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />返回前台
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* 桌面常驻侧栏 */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* 移动端抽屉 */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="后台导航">
          <button
            type="button"
            aria-label="关闭导航"
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 bg-card shadow-xl">{sidebarContent}</div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-xl">
          <Button
            className="-ml-3 lg:hidden"
            variant="ghost"
            size="icon"
            aria-label="展开导航"
            onClick={() => setIsDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">{current?.label ?? '管理后台'}</h1>
          <div className="flex-1" />
          <span className="inline-flex items-center gap-1 rounded-full bg-coral-light px-3 py-1 text-xs font-medium text-coral">
            <ShieldCheck className="h-3.5 w-3.5" />管理员
          </span>
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
