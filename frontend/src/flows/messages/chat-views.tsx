import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { ChatMessage, ConversationItem } from '@/services/messages'

function formatConversationTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  return sameDay
    ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

// ─── Conversation List Item（真实数据） ───
export function ConversationItemView({ conv, isActive, onClick }: { conv: ConversationItem; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all ${isActive ? 'bg-coral-light' : 'hover:bg-muted/50'}`}
    >
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarFallback className="bg-coral-light text-coral-contrast text-sm font-bold">{conv.peerNickname[0]}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-foreground">
            {conv.peerNickname}
            {conv.peerOnline && <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" aria-label="在线" />}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatConversationTime(conv.lastMessageAt)}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{conv.lastMessage ?? ''}</p>
      </div>
      {conv.unreadCount > 0 && (
        <Badge className="h-5 min-w-5 justify-center border-0 bg-coral px-1.5 text-xs text-white">{conv.unreadCount}</Badge>
      )}
    </button>
  )
}

// ─── Message Bubble（真实数据） ───
export function MessageBubble({ message, isSent }: { message: ChatMessage; isSent: boolean }) {
  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isSent
            ? 'rounded-br-md bg-coral text-white'
            : 'rounded-bl-md border border-border/60 bg-card text-foreground'
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}
