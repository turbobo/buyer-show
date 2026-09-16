import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  banAdminPost,
  banUser,
  getAdminPostDetail,
  getAdminUserPosts,
  getAdminUsers,
  unbanAdminPost,
  unbanUser,
  type AdminPostDetail,
  type AdminUser,
  type AdminUserPost,
} from '@/services/admin'

type StatusFilter = 'all' | 'active' | 'banned'

type ConfirmState =
  | { kind: 'banUser'; user: AdminUser }
  | { kind: 'unbanUser'; user: AdminUser }
  | { kind: 'banPost'; post: AdminUserPost }
  | { kind: 'unbanPost'; post: AdminUserPost }

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '正常' },
  { key: 'banned', label: '已封禁' },
]

const PAGE_SIZE = 20

const POST_STATUS_FILTERS: { key: number | undefined; label: string }[] = [
  { key: undefined, label: '全部' },
  { key: 0, label: '公开中' },
  { key: 2, label: '已封禁' },
  { key: 1, label: '待审' },
]

function userStatusBadge(status: number) {
  if (status === 1) {
    return { text: '已封禁', className: 'bg-destructive/10 text-destructive' }
  }
  if (status === 2) {
    return { text: '已注销', className: 'bg-muted text-muted-foreground' }
  }
  return null
}

function postStatusBadge(moderationStatus: number) {
  if (moderationStatus === 2) {
    return { text: '已封禁', className: 'bg-destructive/10 text-destructive' }
  }
  if (moderationStatus === 1) {
    return { text: '待审', className: 'bg-yellow-500/10 text-yellow-600' }
  }
  return { text: '公开中', className: 'bg-emerald-500/10 text-emerald-600' }
}

/**
 * 用户管理（/admin/users）：列表/搜索/筛选、用户封禁/解封、展开管理其帖子（封禁/解封）。
 */
export default function AdminUsersScreen() {
  const { toast } = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [expandedUserId, setExpandedUserId] = useState<number | null>(null)
  const [userPosts, setUserPosts] = useState<AdminUserPost[]>([])
  const [postsTotal, setPostsTotal] = useState(0)
  const [postsPage, setPostsPage] = useState(1)
  const [isPostsLoading, setIsPostsLoading] = useState(false)
  const [postsSearch, setPostsSearch] = useState('')
  const [postsKeyword, setPostsKeyword] = useState('')
  const [postsStatusFilter, setPostsStatusFilter] = useState<number | undefined>(undefined)
  const [previewPost, setPreviewPost] = useState<AdminPostDetail | null>(null)
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null)

  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const statusParam = statusFilter === 'active' ? 0 : statusFilter === 'banned' ? 1 : undefined

  const load = useCallback(async (targetPage: number, append = false) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
      setError(null)
    }
    try {
      const result = await getAdminUsers(targetPage, PAGE_SIZE, keyword || undefined, statusParam)
      setUsers((current) => (append ? [...current, ...result.list] : result.list))
      setTotal(result.total)
      setPage(targetPage)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载用户列表失败')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [keyword, statusParam])

  useEffect(() => { void load(1) }, [load])

  const handleSearch = () => setKeyword(searchInput.trim())

  const loadPosts = useCallback(async (targetPage: number) => {
    if (expandedUserId == null) return
    setIsPostsLoading(true)
    try {
      const result = await getAdminUserPosts(
        expandedUserId,
        targetPage,
        PAGE_SIZE,
        postsKeyword || undefined,
        postsStatusFilter,
      )
      setUserPosts(result.list)
      setPostsTotal(result.total)
      setPostsPage(targetPage)
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '加载用户帖子失败')
    } finally {
      setIsPostsLoading(false)
    }
  }, [expandedUserId, postsKeyword, postsStatusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // 展开用户 / 搜索 / 筛选变化时回到第 1 页（expandedUserId 为空时提前返回）
  useEffect(() => { void loadPosts(1) }, [loadPosts])

  const toggleExpand = (user: AdminUser) => {
    if (expandedUserId === user.id) {
      setExpandedUserId(null)
      return
    }
    setExpandedUserId(user.id)
    setUserPosts([])
    setPostsTotal(0)
    setPostsPage(1)
    setPostsSearch('')
    setPostsKeyword('')
    setPostsStatusFilter(undefined)
  }

  const openPreview = async (post: AdminUserPost) => {
    setPreviewLoadingId(post.id)
    try {
      setPreviewPost(await getAdminPostDetail(post.id))
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '加载帖子详情失败')
    } finally {
      setPreviewLoadingId(null)
    }
  }

  const toPostBrief = (detail: AdminPostDetail): AdminUserPost => ({
    id: detail.id,
    title: detail.title,
    coverImage: detail.images?.[0] ?? null,
    moderationStatus: detail.moderationStatus,
    status: detail.status,
    createdAt: detail.createdAt,
  })

  const refreshAfterPostAction = async (postId: number) => {
    await loadPosts(postsPage)
    if (previewPost?.id === postId) {
      try {
        setPreviewPost(await getAdminPostDetail(postId))
      } catch {
        // 刷新失败（如帖子被删除）时直接关闭预览
        setPreviewPost(null)
      }
    }
  }

  const handleConfirm = async () => {
    if (!confirm) return
    setIsSubmitting(true)
    try {
      if (confirm.kind === 'banUser') {
        await banUser(confirm.user.id, reason.trim() || undefined)
        toast('success', '已封禁用户，其内容已从公开视图隐藏')
        await load(1)
      } else if (confirm.kind === 'unbanUser') {
        await unbanUser(confirm.user.id)
        toast('success', '已解封用户，其内容已恢复可见')
        await load(page)
      } else if (confirm.kind === 'banPost') {
        await banAdminPost(confirm.post.id, reason.trim() || undefined)
        toast('success', '已封禁帖子')
        await refreshAfterPostAction(confirm.post.id)
      } else {
        await unbanAdminPost(confirm.post.id)
        toast('success', '已解封帖子')
        await refreshAfterPostAction(confirm.post.id)
      }
      setConfirm(null)
      setReason('')
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '操作失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmTitle = confirm == null ? '' : {
    banUser: '封禁用户？',
    unbanUser: '解封用户？',
    banPost: '封禁帖子？',
    unbanPost: '解封帖子？',
  }[confirm.kind]

  if (isLoading && users.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
    )
  }

  if (error && users.length === 0) {
    return (
      <div className="mx-auto max-w-sm space-y-3 rounded-2xl border border-destructive/30 bg-card p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => void load(1)}>重试</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-4 text-sm text-muted-foreground">
        管理用户状态与其内容：封禁用户后其帖子从公开视图隐藏；也可单独封禁/解封某篇帖子。
      </p>

      {/* ─── 搜索与筛选 ─── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') handleSearch() }}
            placeholder="搜索昵称 / 用户名"
            className="pl-9"
            aria-label="搜索用户"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>搜索</Button>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={statusFilter === item.key ? 'default' : 'outline'}
              className={statusFilter === item.key ? 'bg-coral text-white hover:bg-coral-dark' : ''}
              onClick={() => setStatusFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ─── 用户列表 ─── */}
      <div className="space-y-3">
        {users.map((user) => {
          const badge = userStatusBadge(user.status)
          const isExpanded = expandedUserId === user.id
          return (
            <div key={user.id} className="rounded-xl border border-border/60 bg-card">
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-label={`展开 ${user.nickname} 的帖子管理`}
                onClick={() => void toggleExpand(user)}
                onKeyDown={(event) => { if (event.key === 'Enter') void toggleExpand(user) }}
                className="flex cursor-pointer items-center gap-3 p-3"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.nickname} />}
                  <AvatarFallback className="bg-coral-light text-sm font-bold text-coral">
                    {user.nickname[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">{user.nickname}</span>
                    <span className="text-xs text-muted-foreground">@{user.username}</span>
                    {user.role === 1 && (
                      <span className="rounded bg-coral-light px-1.5 py-0.5 text-[10px] font-medium text-coral">管理员</span>
                    )}
                    {badge && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>{badge.text}</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    发帖 {user.postCount} · 注册于 {user.createdAt?.slice(0, 10) ?? '—'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
                  {user.status === 1 ? (
                    <Button size="sm" variant="outline" onClick={() => setConfirm({ kind: 'unbanUser', user })}>
                      解封
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={user.role === 1}
                      title={user.role === 1 ? '管理员账号不可封禁' : undefined}
                      onClick={() => setConfirm({ kind: 'banUser', user })}
                    >
                      封禁
                    </Button>
                  )}
                  {isExpanded
                    ? <ChevronUp className="ml-1 h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border/60 p-3">
                  {/* 搜索与状态筛选 */}
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="relative min-w-0 flex-1 sm:max-w-52">
                      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={postsSearch}
                        onChange={(event) => setPostsSearch(event.target.value)}
                        onKeyDown={(event) => { if (event.key === 'Enter') setPostsKeyword(postsSearch.trim()) }}
                        placeholder="搜索帖子标题"
                        className="h-8 pl-8 text-xs"
                        aria-label="搜索该用户帖子"
                      />
                    </div>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setPostsKeyword(postsSearch.trim())}>
                      搜索
                    </Button>
                    <div className="flex gap-1">
                      {POST_STATUS_FILTERS.map((item) => (
                        <Button
                          key={item.label}
                          size="sm"
                          variant={postsStatusFilter === item.key ? 'default' : 'outline'}
                          className={`h-8 ${postsStatusFilter === item.key ? 'bg-coral text-white hover:bg-coral-dark' : ''}`}
                          onClick={() => setPostsStatusFilter(item.key)}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {isPostsLoading && userPosts.length === 0 ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-14 rounded-lg" />
                      ))}
                    </div>
                  ) : userPosts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      {postsKeyword || postsStatusFilter !== undefined ? '没有符合条件的帖子' : '该用户暂无帖子'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {userPosts.map((post) => {
                        const postBadge = postStatusBadge(post.moderationStatus)
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
                              <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${postBadge.className}`}>
                                {postBadge.text}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={previewLoadingId === post.id}
                                onClick={() => void openPreview(post)}
                              >
                                {previewLoadingId === post.id ? '加载中...' : '查看'}
                              </Button>
                              {post.moderationStatus === 2 ? (
                                <Button size="sm" variant="outline" onClick={() => setConfirm({ kind: 'unbanPost', post })}>
                                  解封
                                </Button>
                              ) : post.moderationStatus === 0 ? (
                                <Button size="sm" variant="destructive" onClick={() => setConfirm({ kind: 'banPost', post })}>
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
                          共 {postsTotal} 条 · 第 {postsPage}/{Math.max(Math.ceil(postsTotal / PAGE_SIZE), 1)} 页
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={postsPage <= 1 || isPostsLoading}
                            onClick={() => void loadPosts(postsPage - 1)}
                          >
                            上一页
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={postsPage >= Math.ceil(postsTotal / PAGE_SIZE) || isPostsLoading}
                            onClick={() => void loadPosts(postsPage + 1)}
                          >
                            下一页
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {users.length === 0 && (
          <p className="rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">没有符合条件的用户</p>
        )}

        {users.length < total && (
          <Button
            variant="outline"
            className="w-full"
            disabled={isLoadingMore}
            onClick={() => void load(page + 1, true)}
          >
            {isLoadingMore ? '加载中...' : `加载更多（${users.length}/${total}）`}
          </Button>
        )}
      </div>

      {/* ─── 帖子管理预览（查看后再决定是否封禁） ─── */}
      {previewPost && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="帖子预览"
        >
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl">
            {previewPost.images?.[0]?.startsWith('http') && (
              <div
                className="h-44 w-full shrink-0 bg-muted"
                style={{ background: `url(${previewPost.images[0]}) center / cover` }}
              />
            )}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-foreground">{previewPost.title}</h3>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${postStatusBadge(previewPost.moderationStatus).className}`}>
                  {postStatusBadge(previewPost.moderationStatus).text}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">{previewPost.content}</p>
              {(previewPost.productName || previewPost.productPrice != null) && (
                <p className="text-sm text-coral">
                  ¥{previewPost.productPrice ?? '—'} · {previewPost.productSource ?? '—'}
                  {previewPost.productName ? ` · ${previewPost.productName}` : ''}
                  {previewPost.productRating != null ? ` · ${previewPost.productRating}分` : ''}
                </p>
              )}
              {previewPost.moderationReason && (
                <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                  当前状态说明：{previewPost.moderationReason}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                作者：{previewPost.userNickname ?? `用户${previewPost.userId}`}
                {' · '}发布于 {previewPost.createdAt?.slice(0, 16).replace('T', ' ')}
                {' · '}赞 {previewPost.likeCount} · 评论 {previewPost.commentCount}
              </p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/60 p-4">
              <a
                href={`/posts/${previewPost.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-coral underline-offset-2 hover:underline"
              >
                前台查看 ↗
              </a>
              <div className="flex gap-2">
                {previewPost.moderationStatus === 2 ? (
                  <Button variant="outline" onClick={() => setConfirm({ kind: 'unbanPost', post: toPostBrief(previewPost) })}>
                    解封
                  </Button>
                ) : previewPost.moderationStatus === 0 ? (
                  <Button variant="destructive" onClick={() => setConfirm({ kind: 'banPost', post: toPostBrief(previewPost) })}>
                    封禁
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => setPreviewPost(null)}>关闭</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 确认弹窗（封禁用户/帖子需填理由） ─── */}
      {confirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="确认操作"
        >
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">{confirmTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {confirm.kind === 'banUser' && `「${confirm.user.nickname}」封禁后无法登录，其帖子将从公开视图隐藏，可随时解封。`}
              {confirm.kind === 'unbanUser' && `「${confirm.user.nickname}」解封后可正常登录，其内容恢复可见。`}
              {confirm.kind === 'banPost' && `「${confirm.post.title}」封禁后将从公开视图移除，可随时解封。`}
              {confirm.kind === 'unbanPost' && `「${confirm.post.title}」解封后恢复公开可见。`}
            </p>
            {(confirm.kind === 'banUser' || confirm.kind === 'banPost') && (
              <Textarea
                value={reason}
                maxLength={200}
                onChange={(event) => setReason(event.target.value)}
                placeholder="封禁理由（选填，最多200字）"
                className="min-h-20"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={isSubmitting} onClick={() => { setConfirm(null); setReason('') }}>
                取消
              </Button>
              <Button
                variant={confirm.kind === 'banUser' || confirm.kind === 'banPost' ? 'destructive' : 'default'}
                className={confirm.kind === 'banUser' || confirm.kind === 'banPost' ? '' : 'bg-coral text-white hover:bg-coral-dark'}
                disabled={isSubmitting}
                onClick={() => void handleConfirm()}
              >
                {isSubmitting
                  ? '处理中...'
                  : confirm.kind === 'banUser' || confirm.kind === 'banPost' ? '确认封禁' : '确认解封'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
