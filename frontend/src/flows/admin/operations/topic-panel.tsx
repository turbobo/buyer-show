// 运营管理 · 话题管理面板（G10）
import { useCallback, useEffect, useState } from 'react'
import { Hash, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AppDialog } from '@/components/ui/app-dialog'
import { ErrorState } from '@/components/ui/error-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import {
  createTopic,
  deleteTopic,
  listAdminTopics,
  updateTopic,
  type ApiTopic,
} from '@/services/operations'

interface TopicForm {
  name: string
  coverUrl: string
  description: string
  sortOrder: string
}

const EMPTY_FORM: TopicForm = { name: '', coverUrl: '', description: '', sortOrder: '0' }

export default function TopicPanel() {
  const { toast } = useToast()
  const [topics, setTopics] = useState<ApiTopic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; topic: ApiTopic | null } | null>(null)
  const [form, setForm] = useState<TopicForm>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiTopic | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setTopics(await listAdminTopics())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载话题失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const openDialog = (mode: 'create' | 'edit', topic: ApiTopic | null) => {
    setDialog({ mode, topic })
    setForm(topic ? {
      name: topic.name,
      coverUrl: topic.coverUrl ?? '',
      description: topic.description ?? '',
      sortOrder: String(topic.sortOrder),
    } : EMPTY_FORM)
  }

  const handleSubmit = async () => {
    const payload = {
      name: form.name.trim(),
      coverUrl: form.coverUrl.trim() || undefined,
      description: form.description.trim() || undefined,
      sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
    }
    if (!payload.name) {
      toast('error', '请填写话题名称')
      return
    }
    setIsSubmitting(true)
    try {
      if (dialog?.mode === 'edit' && dialog.topic) {
        await updateTopic(dialog.topic.id, { ...payload, status: dialog.topic.status })
        toast('success', '话题已更新')
      } else {
        await createTopic(payload)
        toast('success', '话题已创建')
      }
      setDialog(null)
      await load()
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '保存失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (topic: ApiTopic) => {
    try {
      await updateTopic(topic.id, {
        name: topic.name,
        coverUrl: topic.coverUrl ?? undefined,
        description: topic.description ?? undefined,
        sortOrder: topic.sortOrder,
        status: topic.status === 0 ? 1 : 0,
      })
      toast('success', topic.status === 0 ? '话题已停用' : '话题已启用')
      await load()
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '操作失败')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteTopic(deleteTarget.id)
      toast('success', '话题已删除（帖子标签不受影响）')
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
        <p className="text-sm text-muted-foreground">话题与同名帖子标签关联：创建话题后，带该标签的帖子自动聚合。</p>
        <Button className="bg-coral text-white hover:bg-coral-dark" onClick={() => openDialog('create', null)}>
          <Plus className="mr-1 h-4 w-4" />新建话题
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
      ) : topics.length === 0 ? (
        <p className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">暂无话题（新建后将出现在话题广场）</p>
      ) : (
        <div className="space-y-2">
          {topics.map((topic) => (
            <article key={topic.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-coral-light">
                <Hash className="h-5 w-5 text-coral" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">#{topic.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {topic.postCount} 篇分享 · 排序 {topic.sortOrder}
                  {topic.description ? ` · ${topic.description}` : ''}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${topic.status === 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                {topic.status === 0 ? '启用中' : '已停用'}
              </span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openDialog('edit', topic)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />编辑
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => void handleToggleStatus(topic)}>
                  {topic.status === 0 ? '停用' : '启用'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(topic)}>
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
        title={dialog?.mode === 'edit' ? '编辑话题' : '新建话题'}
        description="话题名称会作为帖子标签聚合（最长 20 字）"
        footer={(
          <>
            <Button variant="outline" disabled={isSubmitting} onClick={() => setDialog(null)}>取消</Button>
            <Button className="bg-coral text-white hover:bg-coral-dark" disabled={isSubmitting} onClick={() => void handleSubmit()}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </>
        )}
      >
        <div className="space-y-3">
          <Input value={form.name} aria-label="话题名称" placeholder="话题名称（如：咖啡店探店）" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input value={form.coverUrl} aria-label="封面图地址" placeholder="封面图地址（可选）" onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} />
          <Input value={form.description} aria-label="话题简介" placeholder="话题简介（可选，最长 200 字）" onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input value={form.sortOrder} aria-label="排序值" type="number" placeholder="排序值（小在前，默认 0）" onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        </div>
      </AppDialog>

      {/* 删除二次确认 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除话题？"
        description={deleteTarget ? <>将删除「{deleteTarget.name}」，帖子标签不受影响，操作不可撤销。</> : ''}
        confirmText="删除"
        destructive
        isSubmitting={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
