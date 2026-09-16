// 标签管理：聚合统计 + 重命名/合并/删除（影响面预览 + 二次确认）
import { useCallback, useEffect, useState } from 'react'
import { GitMerge, Pencil, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { deleteTag, getTags, mergeTag, renameTag, type TagStat } from '@/services/admin'

type DialogMode = 'rename' | 'merge' | 'delete'

const MODE_TITLES: Record<DialogMode, string> = {
  rename: '重命名标签',
  merge: '合并标签',
  delete: '删除标签',
}

export default function AdminTagsScreen() {
  const { toast } = useToast()
  const [tags, setTags] = useState<TagStat[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ mode: DialogMode; tag: TagStat } | null>(null)
  const [targetInput, setTargetInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = useCallback(async (currentKeyword: string) => {
    setIsLoading(true)
    setError(null)
    try {
      setTags(await getTags(currentKeyword || undefined))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载标签失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 搜索防抖 300ms
  useEffect(() => {
    const timer = window.setTimeout(() => setKeyword(keywordInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [keywordInput])

  useEffect(() => { void load(keyword) }, [load, keyword])

  const openDialog = (mode: DialogMode, tag: TagStat) => {
    setDialog({ mode, tag })
    setTargetInput(mode === 'rename' ? tag.tag : '')
  }

  const handleSubmit = async () => {
    if (!dialog) return
    const { mode, tag } = dialog
    const target = targetInput.trim()
    if (mode !== 'delete' && !target) {
      toast('error', '请输入标签名')
      return
    }
    setIsSubmitting(true)
    try {
      const result = mode === 'rename'
        ? await renameTag(tag.tag, target)
        : mode === 'merge'
          ? await mergeTag(tag.tag, target)
          : await deleteTag(tag.tag)
      const verb = mode === 'rename' ? '重命名' : mode === 'merge' ? '合并' : '删除'
      toast('success', `已${verb}「${tag.tag}」（影响 ${result.affected} 篇）`)
      setDialog(null)
      await load(keyword)
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '操作失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-4 text-sm text-muted-foreground">标签聚合统计（按使用量倒序），支持重命名、合并与删除。</p>

      {/* 搜索 */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={keywordInput}
          aria-label="搜索标签"
          onChange={(event) => setKeywordInput(event.target.value)}
          placeholder="搜索标签..."
          className="h-9 rounded-full bg-muted/50 pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-card p-6 text-center">
          <p className="mb-3 text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void load(keyword)}>重新加载</Button>
        </div>
      ) : tags.length === 0 ? (
        <p className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">
          {keyword ? `没有找到包含「${keyword}」的标签` : '暂无标签数据（发布带标签的帖子后可见）'}
        </p>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <article key={tag.tag} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
              <span className="rounded-full bg-coral-light px-3 py-1 text-sm font-medium text-coral">{tag.tag}</span>
              <span className="text-xs text-muted-foreground">{tag.postCount} 篇</span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openDialog('rename', tag)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  重命名
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openDialog('merge', tag)}>
                  <GitMerge className="mr-1 h-3.5 w-3.5" />
                  合并
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={() => openDialog('delete', tag)}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  删除
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ─── 操作弹窗（含影响面预览） ─── */}
      {dialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={MODE_TITLES[dialog.mode]}
        >
          <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">{MODE_TITLES[dialog.mode]}</h3>
            {dialog.mode === 'delete' ? (
              <p className="mt-2 text-sm text-muted-foreground">
                将把「{dialog.tag.tag}」从 <b className="text-foreground">{dialog.tag.postCount}</b> 篇帖子中移除，操作不可撤销。
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  {dialog.mode === 'rename' ? `重命名「${dialog.tag.tag}」` : `将「${dialog.tag.tag}」并入目标标签`}
                  ，将影响 <b className="text-foreground">{dialog.tag.postCount}</b> 篇帖子。
                </p>
                <Input
                  value={targetInput}
                  autoFocus
                  aria-label="新标签名"
                  onChange={(event) => setTargetInput(event.target.value)}
                  placeholder={dialog.mode === 'rename' ? '输入新标签名' : '输入目标标签名'}
                  className="mt-3"
                />
              </>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" autoFocus={dialog.mode === 'delete'} disabled={isSubmitting} onClick={() => setDialog(null)}>
                取消
              </Button>
              <Button
                variant={dialog.mode === 'delete' ? 'destructive' : 'default'}
                className={dialog.mode === 'delete' ? '' : 'bg-coral text-white hover:bg-coral-dark'}
                disabled={isSubmitting}
                onClick={() => void handleSubmit()}
              >
                {isSubmitting ? '处理中...' : '确认'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
