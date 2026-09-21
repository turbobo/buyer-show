// 运营管理 · 系统公告面板（G11）
import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AppDialog } from '@/components/ui/app-dialog'
import { ErrorState } from '@/components/ui/error-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  offlineAnnouncement,
  updateAnnouncement,
  type Announcement,
} from '@/services/announcements'

const STATUS_META: Record<number, { label: string; className: string }> = {
  0: { label: '草稿', className: 'bg-muted text-muted-foreground' },
  1: { label: '已发布', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  2: { label: '已下线', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
}

interface AnnouncementForm {
  title: string
  content: string
  status: number
}

const EMPTY_FORM: AnnouncementForm = { title: '', content: '', status: 0 }

export default function AnnouncementPanel() {
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; announcement: Announcement | null } | null>(null)
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setAnnouncements(await listAnnouncements())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载公告失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const openDialog = (mode: 'create' | 'edit', announcement: Announcement | null) => {
    setDialog({ mode, announcement })
    setForm(announcement ? {
      title: announcement.title,
      content: announcement.content,
      status: announcement.status === 2 ? 0 : announcement.status,
    } : EMPTY_FORM)
  }

  const handleSubmit = async () => {
    const payload = { title: form.title.trim(), content: form.content.trim(), status: form.status }
    if (!payload.title || !payload.content) {
      toast('error', '请填写公告标题与正文')
      return
    }
    setIsSubmitting(true)
    try {
      if (dialog?.mode === 'edit' && dialog.announcement) {
        await updateAnnouncement(dialog.announcement.id, payload)
        toast('success', payload.status === 1 ? '公告已发布并推送' : '公告已保存')
      } else {
        await createAnnouncement(payload)
        toast('success', payload.status === 1 ? '公告已发布并推送' : '草稿已保存')
      }
      setDialog(null)
      await load()
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '保存失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOffline = async (announcement: Announcement) => {
    try {
      await offlineAnnouncement(announcement.id)
      toast('success', '公告已下线')
      await load()
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '操作失败')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteAnnouncement(deleteTarget.id)
      toast('success', '公告已删除')
      setDeleteTarget(null)
      await load()
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '删除失败')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">发布后实时推送给所有在线用户，用户可在顶部横幅关闭。</p>
        <Button className="bg-coral text-white hover:bg-coral-dark" onClick={() => openDialog('create', null)}>
          <Plus className="mr-1 h-4 w-4" />新建公告
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : announcements.length === 0 ? (
        <p className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">暂无公告</p>
      ) : (
        <div className="space-y-2">
          {announcements.map((announcement) => (
            <article key={announcement.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
              <Megaphone className="h-4 w-4 shrink-0 text-coral" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{announcement.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{announcement.content}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_META[announcement.status]?.className ?? ''}`}>
                {STATUS_META[announcement.status]?.label ?? '未知'}
              </span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openDialog('edit', announcement)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />编辑
                </Button>
                {announcement.status === 1 && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => void handleOffline(announcement)}>
                    下线
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(announcement)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />删除
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <AppDialog
        open={dialog !== null}
        onOpenChange={(next) => { if (!next) setDialog(null) }}
        title={dialog?.mode === 'edit' ? '编辑公告' : '新建公告'}
        footer={(
          <>
            <Button variant="outline" disabled={isSubmitting} onClick={() => setDialog(null)}>取消</Button>
            <Button className="bg-coral text-white hover:bg-coral-dark" disabled={isSubmitting} onClick={() => void handleSubmit()}>
              {isSubmitting ? '保存中...' : (form.status === 1 ? '发布并推送' : '保存草稿')}
            </Button>
          </>
        )}
      >
        <div className="space-y-3">
          <Input value={form.title} aria-label="公告标题" placeholder="公告标题（≤100 字）" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input value={form.content} aria-label="公告正文" placeholder="公告正文（≤2000 字）" onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="公告状态">
            {[{ key: 0, label: '存为草稿' }, { key: 1, label: '立即发布' }].map((option) => (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={form.status === option.key}
                onClick={() => setForm({ ...form, status: option.key })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  form.status === option.key ? 'bg-coral text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </AppDialog>

      {/* 删除二次确认 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除公告？"
        description={deleteTarget ? <>将删除「{deleteTarget.title}」，操作不可撤销。</> : ''}
        confirmText="删除"
        destructive
        isSubmitting={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
