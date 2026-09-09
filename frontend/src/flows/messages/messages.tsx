// FLOW: Messages & Notifications
// SCREEN 1 of 2: Messages Center | PLATFORM: Web (responsive) | ENTRY: /messages | EXIT: Chat
import { useState } from 'react'
import { ArrowLeft, Search, MessageCircle, Send, Image, Mic, MoreVertical, Phone, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { mockConversations, mockMessages, mockNotifications, mockCurrentUser } from '../shared/mock-data'
import type { Conversation, Message, Notification } from '../shared/types'

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
        <div className={`max-w-[280px] rounded-2xl overflow-hidden ${isSent ? 'bg-coral text-white rounded-br-md' : 'bg-white border border-border/60 rounded-bl-md'}`}>
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
      <div className={`max-w-[75%] px-4 py-2.5 text-sm leading-relaxed ${isSent ? 'bg-coral text-white rounded-2xl rounded-br-md' : 'bg-white border border-border/60 text-foreground rounded-2xl rounded-bl-md'}`}>
        {msg.content}
      </div>
    </div>
  )
}

// ─── Notification Item ───
function NotificationItem({ notif }: { notif: Notification }) {
  const iconMap = { like: '❤️', comment: '💬', follow: '👤', system: '📢' }
  const bgMap = { like: 'bg-red-50', comment: 'bg-blue-50', follow: 'bg-green-50', system: 'bg-coral-light' }
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${notif.isRead ? '' : 'bg-coral-light/30'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${bgMap[notif.type]}`}>
        {iconMap[notif.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-relaxed">
          <span className="font-semibold">{notif.actor.nickname}</span>{' '}
          <span className="text-foreground/70">{notif.content}</span>
        </p>
        <span className="text-xs text-muted-foreground">{notif.createdAt}</span>
      </div>
      {notif.type === 'follow' && (
        <Button variant="outline" size="sm" className="text-xs shrink-0 h-7 border-coral/30 text-coral">回关</Button>
      )}
    </div>
  )
}

// ═══════════════════════════════════
// MAIN EXPORT: Messages Screen
// ═══════════════════════════════════
export default function MessagesScreen({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'dm' | 'notifications'>('dm')
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messageText, setMessageText] = useState('')

  // Desktop: split view. Mobile: full-screen switching.
  const showChat = activeConv !== null

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={showChat ? () => setActiveConv(null) : onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">
            {showChat ? activeConv!.user.nickname : '消息'}
          </h1>
          {showChat && (
            <div className="flex items-center gap-1 ml-1">
              {activeConv!.isOnline && <span className="w-2 h-2 bg-green-500 rounded-full" />}
              <span className="text-xs text-muted-foreground">{activeConv!.isOnline ? '在线' : '离线'}</span>
            </div>
          )}
          {showChat && (
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon"><Phone className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon"><Video className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex h-[calc(100vh-56px)]">
        {/* Left Panel: Conversations + Notifications */}
        <div className={`${showChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 shrink-0 border-r border-border/60 bg-white`}>
          {/* Tabs */}
          <div className="p-3">
            <div className="flex bg-muted/50 rounded-xl p-1">
              <button onClick={() => setActiveTab('dm')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'dm' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                私信
              </button>
              <button onClick={() => setActiveTab('notifications')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'notifications' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                互动通知
                <span className="w-4 h-4 bg-coral text-white text-[10px] rounded-full flex items-center justify-center font-bold">3</span>
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
                <div className="flex justify-end px-2 mb-2">
                  <button className="text-xs text-coral hover:underline">全部已读</button>
                </div>
                {mockNotifications.map(notif => (
                  <NotificationItem key={notif.id} notif={notif} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Chat */}
        <div className={`${showChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-warm-bg`}>
          {activeConv ? (
            <>
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
              <div className="border-t border-border/60 bg-white p-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="shrink-0"><Mic className="w-5 h-5 text-muted-foreground" /></Button>
                  <Input
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="输入消息..."
                    className="flex-1 h-10 bg-muted/50 border-0 rounded-full"
                  />
                  <Button variant="ghost" size="icon" className="shrink-0"><Image className="w-5 h-5 text-muted-foreground" /></Button>
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
