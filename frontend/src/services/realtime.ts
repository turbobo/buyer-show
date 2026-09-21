import { Client } from '@stomp/stompjs'
import { getAccessToken } from '@/services/http'
import type { ChatMessage } from '@/services/messages'
import type { Announcement } from '@/services/announcements'

/**
 * 实时推送客户端（G11）：STOMP over WebSocket 单例。
 * 三通道：/user/queue/notifications（通知事件）、/user/queue/messages（私信）、
 * /topic/announcements（系统公告广播）。断线自动重连（3s），REST 轮询为降级兜底。
 */

/** 通知事件（轻量）：仅携带通知 ID，消费方据此刷新未读数与列表。 */
export interface NotificationEventPayload {
  type: string
  userId: number | null
  notificationId: number | null
}

type Handler<T> = (payload: T) => void

function resolveWsUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (typeof base === 'string' && base.startsWith('http')) {
    return base.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '') + '/ws'
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

function safeParse<T>(body: string): T | null {
  try {
    return JSON.parse(body) as T
  } catch {
    return null
  }
}

class RealtimeClient {
  private client: Client | null = null
  private readonly notificationHandlers = new Set<Handler<NotificationEventPayload>>()
  private readonly messageHandlers = new Set<Handler<ChatMessage>>()
  private readonly announcementHandlers = new Set<Handler<Announcement>>()

  /** 有 token 时建立连接；重复调用无副作用。 */
  connect(): void {
    if (this.client?.active) return
    const token = getAccessToken()
    if (!token) return
    const client = new Client({
      brokerURL: resolveWsUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // 每次（重）连接前取最新 token：登录态刷新后重连仍可鉴权
      beforeConnect: () => {
        const latest = getAccessToken()
        if (latest) client.connectHeaders = { Authorization: `Bearer ${latest}` }
      },
      onConnect: () => {
        client.subscribe('/user/queue/notifications', (frame) => {
          const payload = safeParse<NotificationEventPayload>(frame.body)
          if (payload) this.emit(this.notificationHandlers, payload)
        })
        client.subscribe('/user/queue/messages', (frame) => {
          const payload = safeParse<ChatMessage>(frame.body)
          if (payload) this.emit(this.messageHandlers, payload)
        })
        client.subscribe('/topic/announcements', (frame) => {
          const payload = safeParse<Announcement>(frame.body)
          if (payload) this.emit(this.announcementHandlers, payload)
        })
      },
    })
    client.activate()
    this.client = client
  }

  disconnect(): void {
    if (!this.client) return
    void this.client.deactivate()
    this.client = null
  }

  /** 订阅通知事件，返回取消订阅函数。 */
  onNotification(handler: Handler<NotificationEventPayload>): () => void {
    this.notificationHandlers.add(handler)
    return () => this.notificationHandlers.delete(handler)
  }

  /** 订阅私信推送（完整消息），返回取消订阅函数。 */
  onMessage(handler: Handler<ChatMessage>): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  /** 订阅系统公告广播，返回取消订阅函数。 */
  onAnnouncement(handler: Handler<Announcement>): () => void {
    this.announcementHandlers.add(handler)
    return () => this.announcementHandlers.delete(handler)
  }

  private emit<T>(handlers: Set<Handler<T>>, payload: T): void {
    handlers.forEach((handler) => handler(payload))
  }
}

/** 全局实时客户端单例。 */
export const realtime = new RealtimeClient()
