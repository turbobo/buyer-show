// Analytics tracking service
// Collects user interaction events for data analysis

export type EventType = 
  | 'page_view'
  | 'post_view'
  | 'post_create'
  | 'post_like'
  | 'post_favorite'
  | 'post_share'
  | 'comment_create'
  | 'comment_like'
  | 'user_follow'
  | 'search'
  | 'login'
  | 'register'

export interface AnalyticsEvent {
  type: EventType
  timestamp: number
  userId?: number
  postId?: number
  commentId?: number
  targetUserId?: number
  metadata?: Record<string, any>
}

const EVENT_QUEUE: AnalyticsEvent[] = []
const BATCH_SIZE = 10
const FLUSH_INTERVAL = 5000 // 5 seconds

let flushTimer: ReturnType<typeof setInterval> | null = null

/**
 * Track an analytics event
 */
export function track(event: Omit<AnalyticsEvent, 'timestamp'>): void {
  const fullEvent: AnalyticsEvent = {
    ...event,
    timestamp: Date.now(),
  }
  
  EVENT_QUEUE.push(fullEvent)
  
  // Flush if queue is full
  if (EVENT_QUEUE.length >= BATCH_SIZE) {
    flush()
  }
}

/**
 * Flush queued events to backend
 */
export async function flush(): Promise<void> {
  if (EVENT_QUEUE.length === 0) return
  
  const events = [...EVENT_QUEUE]
  EVENT_QUEUE.length = 0
  
  try {
    await fetch('/api/v1/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    })
  } catch (error) {
    // Re-queue events on failure
    EVENT_QUEUE.unshift(...events)
    console.error('[Analytics] Failed to flush events:', error)
  }
}

/**
 * Start automatic flush timer
 */
export function startAutoFlush(): void {
  if (flushTimer) return
  flushTimer = setInterval(flush, FLUSH_INTERVAL)
}

/**
 * Stop automatic flush timer
 */
export function stopAutoFlush(): void {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
}

// Convenience tracking functions
export const trackPageView = (path: string, title?: string) => {
  track({
    type: 'page_view',
    metadata: { path, title },
  })
}

export const trackPostView = (postId: number, postTitle?: string) => {
  track({
    type: 'post_view',
    postId,
    metadata: { postTitle },
  })
}

export const trackPostCreate = (postId: number, hasImages: boolean, hasProduct: boolean) => {
  track({
    type: 'post_create',
    postId,
    metadata: { hasImages, hasProduct },
  })
}

export const trackPostLike = (postId: number, liked: boolean) => {
  track({
    type: 'post_like',
    postId,
    metadata: { liked },
  })
}

export const trackPostFavorite = (postId: number, favorited: boolean) => {
  track({
    type: 'post_favorite',
    postId,
    metadata: { favorited },
  })
}

export const trackCommentCreate = (postId: number, commentId: number) => {
  track({
    type: 'comment_create',
    postId,
    commentId,
  })
}

export const trackUserFollow = (targetUserId: number, followed: boolean) => {
  track({
    type: 'user_follow',
    targetUserId,
    metadata: { followed },
  })
}

export const trackSearch = (query: string, resultCount: number) => {
  track({
    type: 'search',
    metadata: { query, resultCount },
  })
}

export const trackLogin = (method: 'password' | 'sms' | 'oauth') => {
  track({
    type: 'login',
    metadata: { method },
  })
}

export const trackRegister = (method: 'password' | 'sms' | 'oauth') => {
  track({
    type: 'register',
    metadata: { method },
  })
}
