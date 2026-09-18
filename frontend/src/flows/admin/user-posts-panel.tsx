import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { AdminUserPost } from '@/services/admin'
import { postStatusBadge } from './post-preview-dialog'

/** 用户展开区帖子分页大小 */
const PAGE_SIZE = 20

const POST_STATUS_FILTERS: { key: number | undefined; label: string }[] = [
  { key: undefined, label: '全部' },
  { key: 0, label: '公开中' },
  { key: 2, label: '已封禁' },
  { key: 1, label: '待审' },
]

interface UserPostsPanelProps {
  posts: AdminUserPost[]
  total: number
  page: number
  isLoading: boolean
  search: string
  onSearchChange: (value: string) => void
  onSearchSubmit: (keyword: string) => void
  hasFilter: boolean
  statusFilter: number | undefined
  onStatusFilterChange: (value: number | undefined) => void
  previewLoadingId: number | null
  onPreview: (post: AdminUserPost) => void
  onBan: (post: AdminUserPost) => void
  onUnban: (post: AdminUserPost) => void
  onPageChange: (page: number) => void
}

/* ─── 用户展开区：帖子管理面板（搜索/筛选/预览/封禁） ─── */
export function UserPostsPanel({
  posts,
  total,
  page,
  isLoading,
  search,
  onSearchChange,
  onSearchSubmit,
  hasFilter,
  statusFilter,
  onStatusFilterChange,
  previewLoadingId,
  onPreview,
  onBan,
  onUnban,
  onPageChange,
}: UserPostsPanelProps) {
  return (
    <div className="border-t border-border/60 p-3">
      {/* 搜索与状态筛选 */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-52">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') onSearchSubmit(search.trim()) }}
            placeholder="搜索帖子标题"
            className="h-8 pl-8 text-xs"
            aria-label="搜索该用户帖子"
          />
        </div>
        <Button size="sm" variant="outline" className="h-8" onClick={() => onSearchSubmit(search.trim())}>
          搜索
        </Button>
        <div className="flex gap-1">
          {POST_STATUS_FILTERS.map((item) => (
            <Button
              key={item.label}
              size="sm"
              variant={statusFilter === item.key ? 'default' : 'outline'}
              className={`h-8 ${statusFilter === item.key ? 'bg-coral text-white hover:bg-coral-dark' : ''}`}
              onClick={() => onStatusFilterChange(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && posts.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          {hasFilter ? '没有符合条件的帖子' : '该用户暂无帖子'}
        </p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const badge = postStatusBadge(post.moderationStatus)
            return (
              <div key={post.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-2">
                <span
                  className="h-10 w-10 shrink-0 rounded bg-muted"
                  style={post.coverImage?.startsWith('http')
                    ? { background: `url(${post.coverImage}) center / cover` }
                    : undefined}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{post.title}</p>
                  <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
                    {badge.text}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={previewLoadingId === post.id}
                    onClick={() => onPreview(post)}
                  >
                    {previewLoadingId === post.id ? '加载中...' : '查看'}
                  </Button>
                  {post.moderationStatus === 2 ? (
                    <Button size="sm" variant="outline" onClick={() => onUnban(post)}>
                      解封
                    </Button>
                  ) : post.moderationStatus === 0 ? (
                    <Button size="sm" variant="destructive" onClick={() => onBan(post)}>
                      封禁
                    </Button>
                  ) : (
                    <span className="px-2 text-xs text-muted-foreground">待审核</span>
                  )}
                </div>
              </div>
            )
          })}
          {/* 分页器 */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              共 {total} 条 · 第 {page}/{Math.max(Math.ceil(total / PAGE_SIZE), 1)} 页
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || isLoading}
                onClick={() => onPageChange(page - 1)}
              >
                上一页
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= Math.ceil(total / PAGE_SIZE) || isLoading}
                onClick={() => onPageChange(page + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
