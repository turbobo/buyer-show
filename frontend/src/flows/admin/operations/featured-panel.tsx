// 运营管理 · 精选流面板（G10）：帖子精选打标管理（仅审核通过帖可打标）
import { useCallback, useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { useToast } from '@/components/ui/toast'
import { listAdminPosts, setFeatured, type AdminPostRow } from '@/services/operations'

const MODERATION_BADGES: Record<number, { label: string; className: string }> = {
  0: { label: '已过审', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  1: { label: '待审', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  2: { label: '已封禁', className: 'bg-destructive/15 text-destructive' },
}

type FilterKey = 'all' | 'featured'

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'featured', label: '已精选' },
]

export default function FeaturedPanel() {
  const { toast } = useToast()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [rows, setRows] = useState<AdminPostRow[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const load = useCallback(async (currentFilter: FilterKey, cursor?: string) => {
    const isFirstPage = cursor === undefined
    if (isFirstPage) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }
    setError(null)
    try {
      const page = await listAdminPosts(cursor, 20, currentFilter === 'featured' ? 1 : undefined)
      setRows((prev) => (isFirstPage ? page.list : [...prev, ...page.list]))
      setNextCursor(page.nextCursor ?? undefined)
      setHasMore(page.hasMore)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载帖子失败')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  // 切换筛选：重置分页重拉
  useEffect(() => { void load(filter) }, [load, filter])

  const handleToggleFeatured = async (row: AdminPostRow) => {
    setTogglingId(row.id)
    try {
      const next = row.isFeatured !== 1
      await setFeatured(row.id, next)
      setRows((prev) => prev.map((item) => (
        item.id === row.id ? { ...item, isFeatured: next ? 1 : 0 } : item
      )))
      toast('success', next ? `已精选帖子 #${row.id}` : `已取消精选 #${row.id}`)
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '操作失败')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">精选帖进入首页「精选」档；仅审核通过的帖子可打标。</p>
        <div className="flex gap-1 rounded-lg bg-muted p-[3px]">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === option.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load(filter)} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">
          {filter === 'featured' ? '暂无精选帖' : '暂无帖子'}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {rows.map((row) => {
              const moderation = MODERATION_BADGES[row.moderationStatus] ?? MODERATION_BADGES[1]
              const isFeatured = row.isFeatured === 1
              return (
                <article key={row.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">#{row.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.title || '（无标题）'}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${moderation.className}`}>{moderation.label}</span>
                  {isFeatured && <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-label="已精选" />}
                  <Button
                    size="sm"
                    variant={isFeatured ? 'outline' : 'default'}
                    className={`h-8 text-xs ${isFeatured ? '' : 'bg-coral text-white hover:bg-coral-dark'}`}
                    disabled={togglingId === row.id}
                    onClick={() => void handleToggleFeatured(row)}
                  >
                    {togglingId === row.id ? '处理中...' : isFeatured ? '取消精选' : '设为精选'}
                  </Button>
                </article>
              )
            })}
          </div>
          {hasMore && (
            <div className="mt-4 text-center">
              <Button variant="outline" disabled={isLoadingMore} onClick={() => void load(filter, nextCursor)}>
                {isLoadingMore ? '加载中...' : '加载更多'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
