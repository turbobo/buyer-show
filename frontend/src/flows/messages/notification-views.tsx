import { AtSign, Heart, MessageCircle, ShieldCheck, UserPlus } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Notification as AppNotification } from '@/services/notifications'

function notificationIcon(type: AppNotification['type']) {
  switch (type) {
    case 'like': return <Heart className="h-3 w-3 text-red-500" />
    case 'comment': return <MessageCircle className="h-3 w-3 text-blue-500" />
    case 'follow': return <UserPlus className="h-3 w-3 text-green-500" />
    case 'mention': return <AtSign className="h-3 w-3 text-purple-500" />
    case 'system': return <ShieldCheck className="h-3 w-3 text-coral" />
    default: return <MessageCircle className="h-3 w-3 text-muted-foreground" />
  }
}

function notificationText(notification: AppNotification): string {
  switch (notification.type) {
    case 'like': return `赞了你的帖子${notification.content ? `「${notification.content}」` : ''}`
    case 'comment': return `评论了你的帖子${notification.content ? `：${notification.content}` : ''}`
    case 'follow': return '关注了你'
    case 'mention': return `在帖子${notification.content ? `「${notification.content}」` : ''}中提到了你`
    case 'system': return notification.content || '系统通知'
    default: return notification.content || '新通知'
  }
}

function formatNotificationTime(value: string): string {
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Notification Item（真实数据） ───
export function NotificationItem({ notification, onClick }: { notification: AppNotification; onClick: () => void }) {
  const system = notification.type === 'system'
  const displayName = system ? '系统通知' : notification.actorNickname
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/50 ${
        notification.isRead === 0 ? 'bg-coral-light/30' : ''
      }`}
    >
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-coral-light text-xs font-bold text-coral-contrast">{displayName?.[0] ?? '?'}</AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-border/40 bg-card">
          {notificationIcon(notification.type)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-foreground">
          <span className="font-semibold">{displayName}</span>{' '}
          <span className="text-foreground/70">{notificationText(notification)}</span>
        </p>
        <span className="text-xs text-muted-foreground">{formatNotificationTime(notification.createdAt)}</span>
      </div>
      {notification.isRead === 0 && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" />}
    </button>
  )
}
