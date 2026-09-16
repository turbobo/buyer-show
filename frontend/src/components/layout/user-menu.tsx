// 用户身份区（菜单一致性规范）：头像 + 昵称，点击展开下拉菜单
// 菜单项：我的主页 / 编辑资料 / 退出登录（退出走宿主二次确认）
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, LogOut, Pencil, UserRound } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { UserProfile } from '@/services/auth'

export function UserMenu({ user, onLogoutRequest }: { user: UserProfile; onLogoutRequest: () => void }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部 / Esc 关闭
  useEffect(() => {
    if (!open) return
    const onDocClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="账号菜单"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted/50"
      >
        <Avatar className="h-8 w-8">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.nickname} />}
          <AvatarFallback className="bg-coral-light text-xs font-bold text-coral">
            {user.nickname[0]}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-20 truncate text-sm font-medium">{user.nickname}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="账号菜单"
          className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-border/60 bg-card py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => go('/profile')}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/60"
          >
            <UserRound className="h-4 w-4 text-muted-foreground" />
            我的主页
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => go('/profile/edit')}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/60"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
            编辑资料
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => go('/profile/change-password')}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/60"
          >
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            修改密码
          </button>
          <div className="my-1 h-px bg-border/60" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLogoutRequest()
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}
