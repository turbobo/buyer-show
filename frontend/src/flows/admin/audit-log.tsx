// 审计日志：管理员操作全记录（只读查询，动作分组筛选 + 页码分页）
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getAuditLogs, type AuditLogItem } from '@/services/admin'

type FilterKey = 'all' | 'moderation' | 'user' | 'post' | 'report' | 'appeal' | 'tag'

const FILTERS: { key: FilterKey; label: string; actions?: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'moderation', label: '内容审核', actions: 'MODERATE_POST,MODERATE_COMMENT' },
  { key: 'user', label: '用户封禁', actions: 'BAN_USER,UNBAN_USER' },
  { key: 'post', label: '帖子管理', actions: 'BAN_POST,UNBAN_POST' },
  { key: 'report', label: '举报处置', actions: 'HANDLE_REPORT' },
  { key: 'appeal', label: '申诉处理', actions: 'HANDLE_APPEAL' },
  { key: 'tag', label: '标签管理', actions: 'RENAME_TAG,MERGE_TAG,DELETE_TAG' },
]

const ACTION_LABELS: Record<string, { text: string; className: string }> = {
  MODERATE_POST: { text: '帖子审核', className: 'bg-blue-500/90' },
  MODERATE_COMMENT: { text: '评论审核', className: 'bg-blue-500/90' },
  BAN_USER: { text: '封禁用户', className: 'bg-destructive/90' },
  UNBAN_USER: { text: '解封用户', className: 'bg-green-600/90' },
  BAN_POST: { text: '封禁帖子', className: 'bg-destructive/90' },
  UNBAN_POST: { text: '解封帖子', className: 'bg-green-600/90' },
  HANDLE_REPORT: { text: '举报处置', className: 'bg-amber-600/90' },
  HANDLE_APPEAL: { text: '申诉处理', className: 'bg-purple-500/90' },
  RENAME_TAG: { text: '重命名标签', className: 'bg-teal-600/90' },
  MERGE_TAG: { text: '合并标签', className: 'bg-teal-600/90' },
  DELETE_TAG: { text: '删除标签', className: 'bg-destructive/90' },
}

const TARGET_LABELS: Record<string, string> = {
  POST: '帖子',
  COMMENT: '评论',
  USER: '用户',
  REPORT: '举报',
  APPEAL: '申诉',
  TAG: '标签',
}

const PAGE_SIZE = 20

function formatTime(value: string): string {
  return value.replace('T', ' ').slice(0, 16)
}

export default function AdminAuditLogScreen() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (targetPage: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const actions = FILTERS.find((item) => item.key === filter)?.actions
      const result = await getAuditLogs(targetPage, PAGE_SIZE, actions)
      setLogs(result.list)
      setTotal(result.total)
      setPage(targetPage)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载审计日志失败')
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => { void load(1) }, [load])

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)

  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-4 text-sm text-muted-foreground">管理员操作全记录（只读，按时间倒序）。</p>

      {/* 动作分组筛选 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === item.key ? 'bg-coral text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-card p-6 text-center">
          <p className="mb-3 text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void load(page)}>重新加载</Button>
        </div>
      ) : logs.length === 0 ? (
        <p className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">暂无审计记录</p>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => {
              const actionMeta = ACTION_LABELS[log.action] ?? { text: log.action, className: 'bg-muted-foreground' }
              return (
                <article key={log.id} className="rounded-xl border border-border/60 bg-card p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] text-white ${actionMeta.className}`}>
                      {actionMeta.text}
                    </span>
                    <span className="font-medium text-foreground">{log.adminNickname ?? `管理员${log.adminId}`}</span>
                    <span className="text-xs text-muted-foreground">
                      {TARGET_LABELS[log.targetType] ?? log.targetType} #{log.targetId}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatTime(log.createdAt)}</span>
                  </div>
                  {log.detail && <p className="mt-1.5 text-xs text-muted-foreground">说明：{log.detail}</p>}
                </article>
              )
            })}
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => void load(page - 1)}>
              上一页
            </Button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages || isLoading} onClick={() => void load(page + 1)}>
              下一页
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
