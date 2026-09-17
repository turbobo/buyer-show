import { request } from './http'

export interface ConversationItem {
  id: number
  peerId: number
  peerNickname: string
  peerAvatarUrl: string | null
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  /** 对方是否在线（60 秒内有活跃） */
  peerOnline: boolean
}

export interface ChatMessage {
  id: number
  conversationId: number
  senderId: number
  receiverId: number
  content: string
  isRead: number
  createdAt: string
}

export function getConversations(): Promise<ConversationItem[]> {
  return request<ConversationItem[]>('/conversations')
}

/** 发起/复用会话（对方已关注我时可发起）。 */
export function startConversation(targetUserId: number): Promise<ConversationItem> {
  return request<ConversationItem>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  })
}

export function getMessages(
  conversationId: number,
  options?: { beforeId?: number; afterId?: number },
): Promise<ChatMessage[]> {
  const params = new URLSearchParams()
  if (options?.beforeId) params.set('beforeId', String(options.beforeId))
  if (options?.afterId) params.set('afterId', String(options.afterId))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return request<ChatMessage[]>(`/conversations/${conversationId}/messages${suffix}`)
}

export function sendMessage(conversationId: number, content: string): Promise<ChatMessage> {
  return request<ChatMessage>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export function markConversationRead(conversationId: number): Promise<void> {
  return request<void>(`/conversations/${conversationId}/read`, { method: 'POST' })
}
