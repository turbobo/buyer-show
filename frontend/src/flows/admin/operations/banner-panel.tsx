// 运营管理 · Banner 运营位面板（G10）
import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AppDialog } from '@/components/ui/app-dialog'
import { ErrorState } from '@/components/ui/error-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import {
  createBanner,
  deleteBanner,
  listAdminBanners,
  updateBanner,
  type ApiBanner,
} from '@/services/operations'

const LINK_TYPE_OPTIONS = [
  { key: 'url', label: '外链' },
  { key: 'post', label: '帖子' },
  { key: 'topic', label: '话题' },
] as const

const LINK_VALUE_PLACEHOLDER: Record<string, string> = {
  url: 'https://example.com',
  post: '帖子 ID',
  topic: '话题 ID',
}

interface BannerForm {
  title: string
  imageUrl: string
  linkType: string
  linkValue: string
  sortOrder: string
}

const EMPTY_FORM: BannerForm = { title: '', imageUrl: '', linkType: 'url', linkValue: '', sortOrder: '0' }

export default function BannerPanel() {
  const { toast } = useToast()
  const [banners, setBanners] = useState<ApiBanner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; banner: ApiBanner | null } | null>(null)
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ApiBanner | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setBanners(await listAdminBanners())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载 Banner 失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const openDialog = (mode: 'create' | 'edit', banner: ApiBanner | null) => {
    setDialog({ mode, banner })
    setForm(banner ? {
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkType: banner.linkType,
      linkValue: banner.linkValue,
      sortOrder: String(banner.sortOrder),
    } : EMPTY_FORM)
  }

  const handleSubmit = async () => {
    const payload = {
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      linkType: form.linkType,
      linkValue: form.linkValue.trim(),
      sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
    }
    if (!payload.title || !payload.imageUrl || !payload.linkValue) {
      toast('error', '请填写标题、图片地址与跳转目标')
      return
    }
    setIsSubmitting(true)
    try {
      if (dialog?.mode === 'edit' && dialog.banner) {
        await updateBanner(dialog.banner.id, { ...payload, status: dialog.banner.status })
        toast('success', 'Banner 已更新')
      } else {
        await createBanner(payload)
        toast('success', 'Banner 已创建')
      }
      setDialog(null)
      await load()
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '保存失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (banner: ApiBanner) => {
    try {
      await updateBanner(banner.id, {
        title: banner.title,
        imageUrl: banner.imageUrl,
        linkType: banner.linkType,
        linkValue: banner.linkValue,
        sortOrder: banner.sortOrder,
        status: banner.status === 0 ? 1 : 0,
      })
      toast('success', banner.status === 0 ? 'Banner 已停用' : 'Banner 已启用')
      await load()
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '操作失败')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteBanner(deleteTarget.id)
      toast('success', 'Banner 已删除')
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
        <p className="text-sm text-muted-foreground">首页运营位，按排序值升序展示，停用后立即下线。</p>
        <Button className="bg-coral text-white hover:bg-coral-dark" onClick={() => openDialog('create', null)}>
          <Plus className="mr-1 h-4 w-4" />新建 Banner
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
      ) : banners.length === 0 ? (
        <p className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">暂无 Banner（新建后将在首页展示）</p>
      ) : (
        <div className="space-y-2">
          {banners.map((banner) => (
            <article key={banner.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
              <img src={banner.imageUrl} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{banner.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {banner.linkType} → {banner.linkValue} · 排序 {banner.sortOrder}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${banner.status === 0 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                {banner.status === 0 ? '启用中' : '已停用'}
              </span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openDialog('edit', banner)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />编辑
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => void handleToggleStatus(banner)}>
                  {banner.status === 0 ? '停用' : '启用'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(banner)}>
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
        title={dialog?.mode === 'edit' ? '编辑 Banner' : '新建 Banner'}
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
          <Input value={form.title} aria-label="标题" placeholder="标题（如：新人礼包）" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input value={form.imageUrl} aria-label="图片地址" placeholder="图片地址（minio 对象名或完整 URL）" onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="跳转类型">
            {LINK_TYPE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={form.linkType === option.key}
                onClick={() => setForm({ ...form, linkType: option.key })}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  form.linkType === option.key ? 'bg-coral text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Input value={form.linkValue} aria-label="跳转目标" placeholder={LINK_VALUE_PLACEHOLDER[form.linkType]} onChange={(e) => setForm({ ...form, linkValue: e.target.value })} />
          <Input value={form.sortOrder} aria-label="排序值" type="number" placeholder="排序值（小在前，默认 0）" onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        </div>
      </AppDialog>

      {/* 删除二次确认 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除 Banner？"
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
