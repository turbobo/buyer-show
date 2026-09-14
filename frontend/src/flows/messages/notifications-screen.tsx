import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, UserPlus, Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getNotifications, markAllAsRead, type Notification } from '@/services/notifications'

function getNotificationIcon(type: string) {
  switch (type) {
    case 'like': return <Heart className="w-4 h-4 text-red-500" />
    case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />
    case 'follow': return <UserPlus className="w-4 h-4 text-green-500" />
    default: return <Bell className="w-4 h-4 text-gray-500" />
  }
}

function getNotificationText(notification: Notification): string {
  switch (notification.type) {
    case 'like': return `赞了你的帖子${notification.content ? `「${notification.content}」` : ''}`
    case 'comment': return `评论了你的帖子${notification.content ? `：${notification.content}` : ''}`
    case 'follow': return '关注了你'
    default: return notification.content || '新通知'
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  return date.toLocaleDateString('zh-CN')
}

function NotificationItem({ notification }: { notification: Notification }) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (notification.type === 'like' || notification.type === 'comment') {
      if (notification.targetType === 'post' && notification.targetId) {
        navigate(`/posts/${notification.targetId}`)
      }
    } else if (notification.type === 'follow') {
      // Could navigate to user profile in future
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3 p-4 rounded-xl transition-all text-left hover:bg-muted/50 ${
        notification.isRead === 0 ? 'bg-coral-light/30' : ''
      }`}
    >
      <div className="relative shrink-0">
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-coral-light text-coral text-sm font-bold">
            {notification.actorNickname?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-border/40">
          {getNotificationIcon(notification.type)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">
            {notification.actorNickname}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {getNotificationText(notification)}
        </p>
      </div>
      {notification.isRead === 0 && (
        <div className="w-2 h-2 bg-coral rounded-full shrink-0 mt-2" />
      )}
    </button>
  )
}

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [hasUnread, setHasUnread] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getNotifications(50)
      setNotifications(data)
      setHasUnread(data.some(n => n.isRead === 0))
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: 1 })))
      setHasUnread(false)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <h1 className="text-lg font-bold text-foreground">通知</h1>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs text-coral hover:text-coral/80"
          >
            <CheckCheck className="w-4 h-4 mr-1" />
            全部已读
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无通知</p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {notifications.map(notification => (
              <NotificationItem key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
