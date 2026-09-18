// FLOW: Messages & Notifications
// SCREEN 1 of 2: Messages Center | PLATFORM: Web (responsive) | ENTRY: /messages | EXIT: Chat
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCheck, Home, Loader2, MessageCircle, Search, Send, Image, Mic, MoreVertical, Phone, ShieldCheck, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getNotifications, markAllAsRead, type Notification as AppNotification } from '@/services/notifications'
import { useUnreadCount } from '@/hooks/use-unread-count'
import { useUiStore } from '@/stores/ui-store'
import { getTokenUserId } from '@/services/http'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import {
  getConversations,
  getMessages,
  markConversationRead,
  sendMessage,
  type ChatMessage,
  type ConversationItem,
} from '@/services/messages'
import { ConversationItemView, MessageBubble } from './chat-views'
import { NotificationItem } from './notification-views'

// ═══════════════════════════════════
// MAIN EXPORT: Messages Screen
// ═══════════════════════════════════
export default function MessagesScreen({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'dm' | 'notifications'>('dm')
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const [activeConv, setActiveConv] = useState<ConversationItem | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const unreadCount = useUnreadCount()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 会话列表加载
  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true)
    setConversationsError(null)
    try {
      setConversations(await getConversations())
    } catch (requestError) {
      setConversationsError(requestError instanceof Error ? requestError.message : '加载会话失败')
    } finally {
      setIsLoadingConversations(false)
    }
  }, [])

  useEffect(() => { void loadConversations() }, [loadConversations])

  // 打开会话（加载最近消息 + 标记已读 + 刷新列表未读）
  const openConversation = useCallback(async (conversation: ConversationItem) => {
    setActiveConv(conversation)
    setIsLoadingMessages(true)
    try {
      setMessages(await getMessages(conversation.id))
      await markConversationRead(conversation.id)
      setConversations((current) => current.map((item) => (
        item.id === conversation.id ? { ...item, unreadCount: 0 } : item
      )))
    } catch {
      /* 加载失败保持空列表 */
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  // 支持 /messages?c={conversationId} 直接打开会话（从他人主页「私信」进入）
  const conversationParam = searchParams.get('c')
  useEffect(() => {
    if (!conversationParam || activeConv) return
    const matched = conversations.find((item) => item.id === Number(conversationParam))
    if (matched) {
      void openConversation(matched)
    }
  }, [conversationParam, conversations, activeConv, openConversation])

  // 消息自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  // 进入消息页拉取未读数（全局徽标由 ui-store 统一维护）
  useEffect(() => {
    void useUiStore.getState().refreshUnreadCount()
  }, [])

  // 切换到通知 Tab 时加载真实通知
  useEffect(() => {
    if (activeTab !== 'notifications') return
    setIsLoadingNotifications(true)
    getNotifications(50)
      .then((items) => {
        setNotifications(items)
        void useUiStore.getState().refreshUnreadCount()
      })
      .catch(() => { /* 保持现有列表 */ })
      .finally(() => setIsLoadingNotifications(false))
  }, [activeTab])

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead()
      setNotifications((current) => current.map((item) => ({ ...item, isRead: 1 })))
      useUiStore.getState().setUnreadCount(0)
    } catch {
      /* 静默失败，下次进入重试 */
    }
  }

  const handleSendMessage = async () => {
    if (!activeConv || !messageText.trim() || isSending) return
    const content = messageText.trim()
    setIsSending(true)
    try {
      const sent = await sendMessage(activeConv.id, content)
      setMessages((current) => [...current, sent])
      setMessageText('')
      setConversations((current) => current.map((item) => (
        item.id === activeConv.id
          ? { ...item, lastMessage: sent.content, lastMessageAt: sent.createdAt }
          : item
      )))
    } catch (requestError) {
      setConversationsError(requestError instanceof Error ? requestError.message : '发送失败，请重试')
    } finally {
      setIsSending(false)
    }
  }

  // 轮询增量消息（打开会话时每 5s 拉新 + 同步已读与对方在线状态；页面隐藏时暂停）
  useEffect(() => {
    if (!activeConv) return
    const timer = window.setInterval(async () => {
      if (document.hidden) return
      try {
        const lastId = messages.length > 0 ? messages[messages.length - 1].id : undefined
        const fresh = lastId
          ? await getMessages(activeConv.id, { afterId: lastId })
          : await getMessages(activeConv.id)
        if (fresh.length > 0) {
          setMessages((current) => {
            const known = new Set(current.map((message) => message.id))
            return [...current, ...fresh.filter((message) => !known.has(message.id))]
          })
          await markConversationRead(activeConv.id)
        }
        // 同步会话列表（对方在线状态 / 最后消息 / 未读）
        const latest = await getConversations()
        setConversations(latest)
        setActiveConv((current) => {
          if (!current) return current
          const matched = latest.find((item) => item.id === current.id)
          return matched ? { ...current, ...matched } : current
        })
      } catch {
        /* 轮询失败静默，下次重试 */
      }
    }, 5000)
    return () => window.clearInterval(timer)
  }, [activeConv, messages])

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
            {showChat ? activeConv?.peerNickname ?? '消息' : '消息'}
          </h1>
          {showChat && (
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="语音通话"><Phone className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" aria-label="视频通话"><Video className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" aria-label="更多操作"><MoreVertical className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-5xl flex-1 overflow-hidden px-4">
        {/* Left Panel: Conversations + Notifications */}
        <div className={`${showChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 shrink-0 border-r border-border/60 bg-card`}>
          {/* Tabs */}
          <div className="p-3">
            <div className="flex bg-muted/50 rounded-xl p-1">
              <button onClick={() => setActiveTab('dm')} className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === 'dm' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                私信
              </button>
              <button onClick={() => setActiveTab('notifications')} className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'notifications' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
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
                <Input placeholder="搜索对话..." aria-label="搜索对话" className="h-10 pl-9 bg-muted/50 border-0 rounded-full text-sm" />
              </div>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {activeTab === 'dm' ? (
              isLoadingConversations ? (
                <LoadingState label="加载会话" />
              ) : conversationsError ? (
                <div className="px-3 py-8 text-center">
                  <p className="mb-3 text-sm text-destructive">{conversationsError}</p>
                  <Button variant="outline" size="sm" onClick={() => void loadConversations()}>重试</Button>
                </div>
              ) : conversations.length === 0 ? (
                <EmptyState
                  icon={MessageCircle}
                  title="暂无私信"
                  description="对方关注你后，可在其主页点「私信」发起对话"
                  className="px-3"
                />
              ) : (
                <div className="space-y-0.5">
                  {conversations.map((conversation) => (
                    <ConversationItemView
                      key={conversation.id}
                      conv={conversation}
                      isActive={activeConv?.id === conversation.id}
                      onClick={() => void openConversation(conversation)}
                    />
                  ))}
                </div>
              )
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
                  <LoadingState label="加载通知" />
                ) : notifications.length === 0 ? (
                  <EmptyState icon={ShieldCheck} title="暂无通知" className="px-3" />
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
                  <span className="font-semibold text-foreground">{activeConv.peerNickname}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full ${activeConv.peerOnline ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                    {activeConv.peerOnline ? '在线' : '离线'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label="语音通话"><Phone className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="视频通话"><Video className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="更多操作"><MoreVertical className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {isLoadingMessages ? (
                  <LoadingState label="加载消息" />
                ) : messages.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">暂无消息，向对方打个招呼吧</p>
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isSent={message.senderId === getTokenUserId()}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="border-t border-border/60 bg-card p-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="shrink-0" aria-label="语音消息"><Mic className="w-5 h-5 text-muted-foreground" /></Button>
                  <Input
                    value={messageText}
                    aria-label="消息内容"
                    onChange={(event) => setMessageText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void handleSendMessage()
                      }
                    }}
                    placeholder="输入消息..."
                    className="h-10 flex-1 rounded-full border-0 bg-muted/50"
                  />
                  <Button variant="ghost" size="icon" className="shrink-0" aria-label="发送图片"><Image className="w-5 h-5 text-muted-foreground" /></Button>
                  <Button
                    size="icon"
                    aria-label="发送消息"
                    disabled={isSending || !messageText.trim()}
                    onClick={() => void handleSendMessage()}
                    className="h-10 w-10 shrink-0 rounded-full bg-coral text-white hover:bg-coral-dark disabled:opacity-40"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
