// 系统公告横幅（G11）：登录后展示最近一条已发布公告，可关闭（本地记忆）
import { useEffect, useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { getLatestAnnouncement, type Announcement } from '@/services/announcements'
import { realtime } from '@/services/realtime'
import { getAccessToken } from '@/services/http'

const CLOSED_KEY = 'buyer-show.closed-announcement'

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)

  useEffect(() => {
    if (!getAccessToken()) {
      setAnnouncement(null)
      return
    }
    // 初始拉取最近一条已发布公告；已关闭的（localStorage 记忆）不再展示
    let cancelled = false
    getLatestAnnouncement()
      .then((latest) => {
        if (cancelled || !latest) return
        const closedId = Number(localStorage.getItem(CLOSED_KEY) ?? 0)
        if (closedId !== latest.id) setAnnouncement(latest)
      })
      .catch(() => { /* 拉取失败静默，下次进入重试 */ })
    // 实时广播：新公告发布即展示
    const unsubscribe = realtime.onAnnouncement((payload) => {
      setAnnouncement(payload)
      localStorage.removeItem(CLOSED_KEY)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  if (!announcement) return null

  const handleClose = () => {
    localStorage.setItem(CLOSED_KEY, String(announcement.id))
    setAnnouncement(null)
  }

  return (
    <div className="border-b border-coral/20 bg-gradient-to-r from-coral/10 via-coral/5 to-transparent">
      <div className="mx-auto flex max-w-5xl items-start gap-2 px-4 py-2">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-coral" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{announcement.title}</p>
          <p className="line-clamp-2 text-xs text-muted-foreground">{announcement.content}</p>
        </div>
        <button
          type="button"
          aria-label="关闭公告"
          onClick={handleClose}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
