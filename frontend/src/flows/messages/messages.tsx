// FLOW: Messages & Notifications
// SCREEN 1 of 2: Messages Center | PLATFORM: Web (responsive) | ENTRY: /messages | EXIT: Chat
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCheck, Heart, Home, Loader2, MessageCircle, Search, Send, Image, Mic, MoreVertical, Phone, ShieldCheck, UserPlus, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getNotifications, getUnreadCount, markAllAsRead, type Notification as AppNotification } from '@/services/notifications'
import { NOTIFICATIONS_UPDATED_EVENT } from '@/hooks/use-unread-count'
import { mockConversations, mockMessages, mockCurrentUser } from '../shared/mock-data'
import type { Conversation, Message } from '../shared/types'

// ─── Conversation List Item ───
function ConversationItem({ conv, isActive, onClick }: { conv: Conversation; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${isActive ? 'bg-coral-light' : 'hover:bg-muted/50'}`}>
      <div className="relative shrink-0">
        <Avatar className="w-12 h-12">
          <AvatarFallback className="bg-coral-light text-coral text-sm font-bold">{conv.user.nickname[0]}</AvatarFallback>
        </Avatar>
        {conv.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground truncate">{conv.user.nickname}</span>
          <span className="text-xs text-muted-foreground shrink-0">{conv.lastMessageAt}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
      </div>
      {conv.unreadCount > 0 && (
        <Badge className="bg-coral text-white border-0 text-xs min-w-5 h-5 px-1.5 justify-center">{conv.unreadCount}</Badge>
      )}
    </button>
  )
}

// ─── Message Bubble ───
function MessageBubble({ msg, isSent }: { msg: Message; isSent: boolean }) {
  if (msg.type === 'product' && msg.productData) {
    return (
      <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[280px] rounded-2xl overflow-hidden ${isSent ? 'bg-coral text-white rounded-br-md' : 'bg-card border border-border/60 rounded-bl-md'}`}>
          <div className="flex items-center gap-3 p-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: 'linear-gradient(135deg,#fecdd3,#fda4af)' }}>🧴</div>
            <div className="min-w-0">
              <div className={`text-sm font-semibold truncate ${isSent ? '' : 'text-foreground'}`}>{msg.productData.name}</div>
              <div className={`text-xs ${isSent ? 'opacity-80' : 'text-muted-foreground'}`}>¥{msg.productData.price} · {msg.productData.source}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${isSent ? 'bg-coral text-white rounded-2xl rounded-br-md' : 'bg-card border border-border/60 text-foreground rounded-2xl rounded-bl-md'}`}>
        {msg.content}
      </div>
    </div>
  )
}

// ─── Notification Item（真实数据） ───
function notificationIcon(type: AppNotification['type']) {
  switch (type) {
    case 'like': return <Heart className="h-3 w-3 text-red-500" />
    case 'comment': return <MessageCircle className="h-3 w-3 text-blue-500" />
    case 'follow': return <UserPlus className="h-3 w-3 text-green-500" />
    case 'system': return <ShieldCheck className="h-3 w-3 text-coral" />
    default: return <MessageCircle className="h-3 w-3 text-muted-foreground" />
  }
}

function notificationText(notification: AppNotification): string {
  switch (notification.type) {
    case 'like': return `赞了你的帖子${notification.content ? `「${notification.content}」` : ''}`
    case 'comment': return `评论了你的帖子${notification.content ? `：${notification.content}` : ''}`
    case 'follow': return '关注了你'
    case 'system': return notification.content || '系统通知'
    default: return notification.content || '新通知'
  }
}

function formatNotificationTime(value: string): string {
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function NotificationItem({ notification, onClick }: { notification: AppNotification; onClick: () => void }) {
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
          <AvatarFallback className="bg-coral-light text-xs font-bold text-coral">{displayName?.[0] ?? '?'}</AvatarFallback>
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

// ═══════════════════════════════════
// MAIN EXPORT: Messages Screen
// ═══════════════════════════════════
export default function MessagesScreen({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'dm' | 'notifications'>('dm')
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messageText, setMessageText] = useState('')
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // 进入消息页拉取未读数（徽标展示）
  useEffect(() => {
    getUnreadCount()
      .then((data) => setUnreadCount(data.count ?? 0))
      .catch(() => { /* 未登录/网络异常时保持 0 */ })
  }, [])

  // 切换到通知 Tab 时加载真实通知
  useEffect(() => {
    if (activeTab !== 'notifications') return
    setIsLoadingNotifications(true)
    getNotifications(50)
      .then((items) => {
        setNotifications(items)
        setUnreadCount(items.filter((item) => item.isRead === 0).length)
      })
      .catch(() => { /* 保持现有列表 */ })
      .finally(() => setIsLoadingNotifications(false))
  }, [activeTab])

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead()
      setNotifications((current) => current.map((item) => ({ ...item, isRead: 1 })))
      setUnreadCount(0)
      window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT))
    } catch {
      /* 静默失败，下次进入重试 */
    }
  }

  // Desktop: split view. Mobile: full-screen switching.
  const showChat = activeConv !== null

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-background md:h-[calc(100dvh-57px)]">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border md:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <div className="flex items-center gap-1 -ml-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label={showChat ? '返回对话列表' : '返回上一页'}
              onClick={showChat ? () => setActiveConv(null) : onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {!showChat && (
              <Button aria-label="返回首页" variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/')}>
                <Home className="h-5 w-5" />
              </Button>
            )}
          </div>
          <h1 className="flex-1 truncate text-lg font-bold text-foreground">
            {showChat ? activeConv?.user.nickname ?? "消息" : '消息'}
          </h1>
          {showChat && (
            <div className="flex items-center gap-1 ml-1">
              {activeConv?.isOnline && <span className="w-2 h-2 bg-green-500 rounded-full" />}
              <span className="text-xs text-muted-foreground">{activeConv?.isOnline ? '在线' : '离线'}</span>
            </div>
          )}
          {showChat && (
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="语音通话"><Phone className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" aria-label="视频通话"><Video className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" aria-label="更多操作"><MoreVertical className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      </nav>

      {/* 静态数据提示（仅私信 Tab） */}
      {activeTab === 'dm' && (
        <div className="mx-auto w-full max-w-5xl px-4 pt-3">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-xs text-amber-700">
            ⚠️ 私信功能开发中，敬请期待；互动通知已接入真实数据
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-5xl flex-1 overflow-hidden px-4">
        {/* Left Panel: Conversations + Notifications */}
        <div className={`${showChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 shrink-0 border-r border-border/60 bg-card`}>
          {/* Tabs */}
          <div className="p-3">
            <div className="flex bg-muted/50 rounded-xl p-1">
              <button onClick={() => setActiveTab('dm')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'dm' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                私信
              </button>
              <button onClick={() => setActiveTab('notifications')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'notifications' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                互动通知
                {unreadCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search */}
          {activeTab === 'dm' && (
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索对话..." className="pl-9 h-9 bg-muted/50 border-0 rounded-full text-sm" />
              </div>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {activeTab === 'dm' ? (
              <div className="space-y-0.5">
                {mockConversations.map(conv => (
                  <ConversationItem key={conv.id} conv={conv} isActive={activeConv?.id === conv.id} onClick={() => setActiveConv(conv)} />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {unreadCount > 0 && (
                  <div className="mb-2 flex justify-end px-2">
                    <button
                      type="button"
                      onClick={() => void handleMarkAllRead()}
                      className="flex items-center gap-1 text-xs text-coral hover:underline"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      全部已读
                    </button>
                  </div>
                )}
                {isLoadingNotifications ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">暂无通知</p>
                ) : (
                  notifications.map((item) => (
                    <NotificationItem
                      key={item.id}
                      notification={item}
                      onClick={() => {
                        if (item.type === 'follow') {
                          if (item.actorId != null) navigate(`/user/${item.actorId}`)
                        } else if (item.targetType === 'post' && item.targetId != null) {
                          navigate(`/posts/${item.targetId}`)
                        }
                      }}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Chat */}
        <div className={`${showChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-background`}>
          {activeConv ? (
            <>
              {/* PC 聊天头部（移动端由导航栏承载） */}
              <div className="hidden items-center justify-between border-b border-border/60 px-4 py-2 md:flex">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{activeConv.user.nickname}</span>
                  {activeConv.isOnline && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      在线
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label="语音通话"><Phone className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="视频通话"><Video className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="更多操作"><MoreVertical className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-center">
                  <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">今天 14:20</span>
                </div>
                {mockMessages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} isSent={msg.senderId === mockCurrentUser.id} />
                ))}
              </div>

              {/* Input Bar */}
              <div className="border-t border-border/60 bg-card p-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="shrink-0" aria-label="语音消息"><Mic className="w-5 h-5 text-muted-foreground" /></Button>
                  <Input
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="输入消息..."
                    className="flex-1 h-10 bg-muted/50 border-0 rounded-full"
                  />
                  <Button variant="ghost" size="icon" className="shrink-0" aria-label="发送图片"><Image className="w-5 h-5 text-muted-foreground" /></Button>
                  <Button size="icon" className="shrink-0 w-10 h-10 bg-coral hover:bg-coral-dark text-white rounded-full">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <MessageCircle className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-sm">选择一个对话开始聊天</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
