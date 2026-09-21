import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, BarChart3, FolderPlus, Heart, Home, Loader2, MessageSquare, Monitor, Moon, Pencil, Settings2, Sun, Trash2, UserCheck, UserPlus, UserX } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { Textarea } from '@/components/ui/textarea'
import { clearTokens, getAccessToken, getTokenUserId } from '@/services/http'
import type { UserProfile } from '@/services/auth'
import { fetchMe, useSessionCache } from '@/hooks/use-me'
import { blockUser, deactivateAccount, getBlockedUsers, getMyFolders, getMyPosts, getUserFavorites, getUserLikes, getUserPosts, getUserProfile, toggleFollow, unblockUser, type BlockedUser, type FavoriteFolder } from '@/services/users'
import { startConversation } from '@/services/messages'
import { FavoriteFolderManager } from '@/flows/profile/favorite-folder-manager'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AppDialog } from '@/components/ui/app-dialog'
import { ErrorState } from '@/components/ui/error-state'
import { MyCommentsPanel } from '@/flows/profile/my-comments'
import { smartBack } from '@/lib/smart-back'
import { useUiStore } from '@/stores/ui-store'
import { useTheme } from '@/hooks/use-theme'
import { deletePost, createPostAppeal, type ApiPostSummary } from '@/services/posts'

type ProfileTab = 'posts' | 'favorites' | 'likes' | 'comments' | 'blocks'

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: 'posts', label: '分享' },
  { key: 'favorites', label: '收藏' },
  { key: 'likes', label: '赞过' },
  { key: 'comments', label: '评论' },
  { key: 'blocks', label: '拉黑' },
]

/** 帖子网格卡片（manageable 时显示编辑/删除操作与审核状态徽标；已封禁帖子提供申诉入口） */
function PostGridItem({ post, manageable, onDeleteRequest, onAppealRequest }: {
  post: ApiPostSummary
  manageable: boolean
  onDeleteRequest: (post: ApiPostSummary) => void
  onAppealRequest: (post: ApiPostSummary) => void
}) {
  const navigate = useNavigate()
  const cover = post.thumbnails?.[0] ?? post.images[0]
  const isBanned = post.moderationStatus === 2
  const statusBadge = post.moderationStatus === 1
    ? { text: '审核中', className: 'bg-yellow-500/90' }
    : isBanned
      ? { text: '已下架', className: 'bg-destructive/90' }
      : null
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => navigate(`/posts/${post.id}`, { state: { modal: true } })}
        className="group w-full overflow-hidden rounded-xl border border-border/60 bg-card text-left transition-all hover:-translate-y-0.5 hover:border-coral/20 hover:shadow-lg"
      >
        <div className="relative aspect-[3/4] bg-muted">
          {cover?.startsWith('http') && (
            <img
              src={cover}
              alt={post.title}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(event) => { event.currentTarget.style.display = 'none' }}
            />
          )}
          {statusBadge && (
            <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] text-white ${statusBadge.className}`}>
              {statusBadge.text}
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-relaxed text-foreground">{post.title}</h3>
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Heart className="h-3.5 w-3.5" />
            <span>{post.likeCount}</span>
          </div>
        </div>
      </button>
      {manageable && (
        <div className="absolute right-1.5 top-1.5 flex gap-1">
          {isBanned ? (
            post.appealStatus === 0 ? (
              <span className="flex h-6 items-center rounded-full bg-black/60 px-2 text-[10px] text-white">申诉中</span>
            ) : (
              <button
                type="button"
                aria-label="发起申诉"
                onClick={() => onAppealRequest(post)}
                className="flex h-6 items-center justify-center rounded-full bg-black/60 px-2 text-[10px] text-white transition-colors hover:bg-coral"
              >
                申诉
              </button>
            )
          ) : (
            <button
              type="button"
              aria-label="编辑帖子"
              onClick={() => navigate(`/posts/${post.id}/edit`)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            aria-label="删除帖子"
            onClick={() => onDeleteRequest(post)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProfileScreen({ self = false }: { self?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams<{ userId: string }>()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<ApiPostSummary[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isListLoading, setIsListLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts')
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false)
  const [isStartingChat, setIsStartingChat] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ApiPostSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [isBlockLoading, setIsBlockLoading] = useState(false)
  const [isBlockSubmitting, setIsBlockSubmitting] = useState(false)
  const [pendingBlock, setPendingBlock] = useState<boolean | null>(null)
  const [appealTarget, setAppealTarget] = useState<ApiPostSummary | null>(null)
  const [appealReason, setAppealReason] = useState('')
  const [isAppealSubmitting, setIsAppealSubmitting] = useState(false)
  /** 注销账号（软注销，不可逆）：ConfirmDialog 二次确认 + 成功清会话跳首页 */
  const [pendingDeactivate, setPendingDeactivate] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  /** G7 收藏夹：夹列表 + 当前筛选（null=全部） + 管理弹窗 */
  const [folders, setFolders] = useState<FavoriteFolder[]>([])
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null)
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const profileRef = useRef<UserProfile | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const isLoggedIn = getAccessToken() != null
  const { clearSessionCache } = useSessionCache()
  const isOwn = self || (profile != null && getTokenUserId() === profile.id)
  // 「评论」仅在本人主页可见（隐私：评论互动上下文不对外）；「拉黑」管理仅本人可见
  const visibleTabs = isOwn
    ? PROFILE_TABS
    : PROFILE_TABS.filter((tab) => tab.key !== 'comments' && tab.key !== 'blocks')

  const loadPage = useCallback(async (nextCursor?: string, append = false) => {
    if (!self && !params.userId) return
    if (append) {
      setIsLoadingMore(true)
    } else {
      setError(null)
      if (profileRef.current == null) {
        setIsLoading(true)
      } else {
        setIsListLoading(true)
      }
    }
    try {
      const targetProfile = profileRef.current
        // 本人主页复用 me 共享缓存（fresh 强制重拉，结果回写缓存同步 Header/UserMenu）
        ?? (self ? await fetchMe(queryClient, { fresh: true }) : await getUserProfile(params.userId ?? ''))
      // 「评论」Tab 由 MyCommentsPanel 自行加载，跳过帖子请求
      if (activeTab === 'comments') {
        profileRef.current = targetProfile
        setProfile(targetProfile)
        setPosts([])
        setCursor(null)
        setHasMore(false)
        return
      }
      // 「拉黑」Tab 加载黑名单列表（仅本人可见）
      if (activeTab === 'blocks') {
        profileRef.current = targetProfile
        setProfile(targetProfile)
        setPosts([])
        setCursor(null)
        setHasMore(false)
        setIsBlockLoading(true)
        try {
          setBlockedUsers(await getBlockedUsers())
        } finally {
          setIsBlockLoading(false)
        }
        return
      }
      const page = activeTab === 'favorites'
        ? await getUserFavorites(targetProfile.id, nextCursor, activeFolderId ?? undefined)
        : activeTab === 'likes'
          ? await getUserLikes(targetProfile.id, nextCursor)
          : self ? await getMyPosts(nextCursor) : await getUserPosts(targetProfile.id, nextCursor)
      profileRef.current = targetProfile
      setProfile(targetProfile)
      setPosts((current) => (append ? [...current, ...page.list] : page.list))
      setCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载失败，请稍后重试')
    } finally {
      setIsLoading(false)
      setIsListLoading(false)
      setIsLoadingMore(false)
    }
  }, [self, params.userId, activeTab, activeFolderId, queryClient])

  useEffect(() => { void loadPage() }, [loadPage])

  // 触底自动加载更多
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !hasMore || isLoading) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore && cursor) {
          void loadPage(cursor, true)
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isLoading, isLoadingMore, cursor, loadPage])

  /** G7：本人主页收藏 tab 时加载收藏夹列表（失败静默，chips 仅显示「全部」）。 */
  const loadFolders = useCallback(async () => {
    if (!isOwn) return
    try {
      setFolders(await getMyFolders())
    } catch {
      setFolders([])
    }
  }, [isOwn])

  useEffect(() => {
    if (isOwn && activeTab === 'favorites') {
      void loadFolders()
    }
  }, [isOwn, activeTab, loadFolders])

  /** 切 tab：离开收藏 tab 时重置夹筛选。 */
  const handleTabChange = (tab: ProfileTab) => {
    if (tab !== 'favorites') {
      setActiveFolderId(null)
    }
    setActiveTab(tab)
  }

  const handleFollow = async () => {
    if (!profile) return
    if (!isLoggedIn) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)
      return
    }
    setIsFollowSubmitting(true)
    try {
      const result = await toggleFollow(profile.id)
      const nextProfile: UserProfile = {
        ...profile,
        isFollowing: result.followed,
        followerCount: Math.max(profile.followerCount + (result.followed ? 1 : -1), 0),
      }
      profileRef.current = nextProfile
      setProfile(nextProfile)
      toast('success', result.followed ? '已关注' : '已取消关注')
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '操作失败')
    } finally {
      setIsFollowSubmitting(false)
    }
  }

  const handleStartChat = async () => {
    if (!profile) return
    setIsStartingChat(true)
    try {
      const conversation = await startConversation(profile.id)
      navigate(`/messages?c=${conversation.id}`)
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '无法发起私信')
    } finally {
      setIsStartingChat(false)
    }
  }

  const handleBlock = async () => {
    if (!profile) return
    setIsBlockSubmitting(true)
    try {
      await blockUser(profile.id)
      setProfile((current) => current ? { ...current, blockedByMe: true } : current)
      if (profileRef.current) profileRef.current = { ...profileRef.current, blockedByMe: true }
      setPosts([])
      setHasMore(false)
      toast('success', '已拉黑，对方的内容将不再对你可见')
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '拉黑失败')
    } finally {
      setIsBlockSubmitting(false)
      setPendingBlock(null)
    }
  }

  const handleUnblock = async (targetId?: number) => {
    const target = targetId ?? profile?.id
    if (!target) return
    setIsBlockSubmitting(true)
    try {
      await unblockUser(target)
      if (!targetId) {
        setProfile((current) => current ? { ...current, blockedByMe: false } : current)
        if (profileRef.current) profileRef.current = { ...profileRef.current, blockedByMe: false }
        void loadPage()
      } else {
        setBlockedUsers((current) => current.filter((item) => item.id !== target))
      }
      toast('success', '已解除拉黑')
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '解除拉黑失败')
    } finally {
      setIsBlockSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await deletePost(String(pendingDelete.id))
      setPosts((current) => current.filter((item) => item.id !== pendingDelete.id))
      setProfile((current) => {
        if (!current) return current
        const next = { ...current, postCount: Math.max(current.postCount - 1, 0) }
        profileRef.current = next
        return next
      })
      toast('success', '已删除')
      setPendingDelete(null)
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '删除失败')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSubmitAppeal = async () => {
    if (!appealTarget) return
    setIsAppealSubmitting(true)
    try {
      await createPostAppeal(String(appealTarget.id), appealReason.trim())
      toast('success', '申诉已提交，等待管理员处理')
      setPosts((current) => current.map((item) => (
        item.id === appealTarget.id ? { ...item, appealStatus: 0 } : item
      )))
      setAppealTarget(null)
      setAppealReason('')
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '提交申诉失败')
    } finally {
      setIsAppealSubmitting(false)
    }
  }

  /** 注销账号：软删全部帖子并置注销状态，不可逆；成功后清会话缓存回首页。 */
  const handleConfirmDeactivate = async () => {
    setIsDeactivating(true)
    try {
      await deactivateAccount()
      clearTokens()
      clearSessionCache()
      useUiStore.getState().setUnreadCount(0)
      setPendingDeactivate(false)
      toast('success', '账号已注销，感谢使用')
      navigate('/')
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '注销失败，请稍后重试')
    } finally {
      setIsDeactivating(false)
    }
  }

  const emptyText = activeTab === 'favorites'
    ? '还没有收藏'
    : activeTab === 'likes'
      ? '还没有点赞'
      : profile?.blockedByMe
        ? '你已拉黑该用户，TA 的内容不再可见'
        : isOwn ? '还没有发布分享' : '还没有公开分享'

  const navBar = (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <div className="flex items-center gap-1 -ml-3">
          <Button aria-label="返回上一页" variant="ghost" size="icon" onClick={() => smartBack()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button aria-label="返回首页" variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/')}>
            <Home className="h-5 w-5" />
          </Button>
        </div>
        <h1 className="text-lg font-bold text-foreground">{self ? '我的主页' : '个人主页'}</h1>
        <div className="ml-auto">
          <Button
            aria-label={`切换主题（当前：${theme === 'system' ? '跟随系统' : theme === 'light' ? '浅色' : '深色'}）`}
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system')}
          >
            {theme === 'system' ? <Monitor className="h-5 w-5" /> : theme === 'light' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </nav>
  )

  if (isLoading && !profile) {
    return (
      <div className="min-h-screen bg-background">
        {navBar}
        <main className="mx-auto max-w-5xl px-4 py-6">
          <Skeleton className="h-40 rounded-2xl" />
          <div className="mt-6 columns-2 gap-3 space-y-3 md:columns-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[3/4] break-inside-avoid rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <ErrorState
          message={error}
          className="w-full max-w-sm rounded-2xl p-8"
          action={(
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => void loadPage()}>重试</Button>
              <Button onClick={() => navigate('/')}>返回首页</Button>
            </div>
          )}
        />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-background">
      {navBar}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar className="h-20 w-20 shrink-0">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.nickname} />}
              <AvatarFallback className="bg-coral-light text-2xl font-bold text-coral-contrast">
                {profile.nickname[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold text-foreground">{profile.nickname}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="mt-2 text-sm text-foreground/80">{profile.bio}</p>}
              <div className="mt-3 flex gap-6 text-sm">
                <button type="button" className="cursor-pointer" onClick={() => setActiveTab('posts')}>
                  <b className="text-foreground">{profile.postCount}</b> <span className="text-muted-foreground">分享</span>
                </button>
                <button type="button" className="cursor-pointer" onClick={() => navigate(`/user/${profile.id}/followers`)}>
                  <b className="text-foreground">{profile.followerCount}</b> <span className="text-muted-foreground">粉丝</span>
                </button>
                <button type="button" className="cursor-pointer" onClick={() => navigate(`/user/${profile.id}/following`)}>
                  <b className="text-foreground">{profile.followingCount}</b> <span className="text-muted-foreground">关注</span>
                </button>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 max-md:w-full">
              {isOwn ? (
                <>
                  <Button variant="outline" onClick={() => navigate('/profile/edit')}>编辑资料</Button>
                  <Button
                    variant="outline"
                    aria-label="创作数据"
                    onClick={() => navigate('/profile/creator-stats')}
                  >
                    <BarChart3 className="mr-1 h-4 w-4" />创作数据
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setPendingDeactivate(true)}
                  >
                    <UserX className="mr-1 h-4 w-4" />注销账号
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant={profile.isFollowing ? 'outline' : 'default'}
                    className={`h-10 ${profile.isFollowing ? '' : 'bg-coral text-white hover:bg-coral-dark'}`}
                    disabled={isFollowSubmitting}
                    onClick={() => void handleFollow()}
                  >
                    {profile.isFollowing
                      ? <><UserCheck className="mr-1 h-4 w-4" />已关注</>
                      : <><UserPlus className="mr-1 h-4 w-4" />关注</>}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={isStartingChat}
                    onClick={() => void handleStartChat()}
                  >
                    <MessageSquare className="mr-1 h-4 w-4" />
                    私信
                  </Button>
                  {profile.blockedByMe ? (
                    <Button
                      variant="outline"
                      className="h-10 text-destructive hover:bg-destructive/10"
                      disabled={isBlockSubmitting}
                      onClick={() => void handleUnblock()}
                    >
                      <Ban className="mr-1 h-4 w-4" />
                      解除拉黑
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="h-10"
                      disabled={isBlockSubmitting}
                      onClick={() => setPendingBlock(true)}
                    >
                      <Ban className="mr-1 h-4 w-4" />
                      拉黑
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div role="tablist" aria-label="帖子分类" className="sticky top-14 z-40 mb-4 flex border-b border-border bg-background">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex-1 border-b-2 px-3 pb-3 pt-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-coral text-coral'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* G7：本人主页收藏 tab 的收藏夹筛选与管理（activeFolderId：null=全部、0=默认夹、>0=指定夹） */}
          {isOwn && activeTab === 'favorites' && (
            <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveFolderId(null)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFolderId === null
                    ? 'bg-coral text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setActiveFolderId(0)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFolderId === 0
                    ? 'bg-coral text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <FolderPlus className="size-3" />
                默认收藏夹
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setActiveFolderId(folder.id)}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeFolderId === folder.id
                      ? 'bg-coral text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FolderPlus className="size-3" />
                  {folder.name}
                  <span className="opacity-70">{folder.postCount}</span>
                </button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0"
                onClick={() => setIsFolderManagerOpen(true)}
              >
                <Settings2 className="mr-1 size-3.5" />
                管理
              </Button>
            </div>
          )}
          {activeTab === 'comments' ? (
            <MyCommentsPanel />
          ) : activeTab === 'blocks' ? (
            <div className="rounded-xl border border-border/60 bg-card">
              {isBlockLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : blockedUsers.length === 0 ? (
                <p className="p-12 text-center text-sm text-muted-foreground">还没有拉黑任何人</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {blockedUsers.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        {item.avatarUrl && <AvatarImage src={item.avatarUrl} alt={item.nickname} />}
                        <AvatarFallback className="bg-coral-light text-xs font-bold text-coral-contrast">
                          {item.nickname[0] ?? '用'}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:text-coral"
                        onClick={() => navigate(`/user/${item.id}`)}
                      >
                        {item.nickname}
                      </button>
                      <span className="hidden text-xs text-muted-foreground sm:block">{item.blockedAt}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isBlockSubmitting}
                        onClick={() => void handleUnblock(item.id)}
                      >
                        解除拉黑
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              {isListLoading ? (
                <div className="columns-2 gap-3 space-y-3 md:columns-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="aspect-[3/4] break-inside-avoid rounded-xl" />
                  ))}
                </div>
              ) : (
                <>
                  {posts.length === 0 && (
                    <p className="rounded-xl bg-card p-12 text-center text-sm text-muted-foreground">{emptyText}</p>
                  )}
                  <div className="columns-2 gap-3 space-y-3 md:columns-3">
                    {posts.map((post) => (
                      <div key={post.id} className="break-inside-avoid">
                        <PostGridItem
                          post={post}
                          manageable={isOwn && activeTab === 'posts'}
                          onDeleteRequest={setPendingDelete}
                          onAppealRequest={setAppealTarget}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div ref={loadMoreRef} className="py-8 text-center">
                {isLoadingMore && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}
                {!hasMore && posts.length > 0 && <span className="text-xs text-muted-foreground">已经到底啦</span>}
              </div>
            </>
          )}
        </section>
      </main>

      {/* ─── 拉黑确认（G6：破坏性操作统一 ConfirmDialog） ─── */}
      <ConfirmDialog
        open={pendingBlock === true}
        title={`拉黑 @${profile.username}？`}
        description="拉黑后双方内容互不可见、不能互发私信，并自动取消双方关注。"
        confirmText="拉黑"
        destructive
        isSubmitting={isBlockSubmitting}
        onConfirm={() => void handleBlock()}
        onCancel={() => setPendingBlock(null)}
      />

      {/* ─── 删除帖子确认（U34：统一 ConfirmDialog） ─── */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除这条分享？"
        description={pendingDelete ? `「${pendingDelete.title}」删除后不可恢复。` : undefined}
        confirmText="删除"
        destructive
        isSubmitting={isDeleting}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />

      {/* ─── 发起申诉（U34：统一 AppDialog） ─── */}
      <AppDialog
        open={appealTarget !== null}
        onOpenChange={(next) => { if (!next) { setAppealTarget(null); setAppealReason('') } }}
        title="发起申诉"
        description={appealTarget ? `「${appealTarget.title}」已被下架，无法修改。提交申诉后由管理员复核，请说明理由。` : undefined}
        footer={(
          <>
            <Button variant="outline" disabled={isAppealSubmitting} onClick={() => { setAppealTarget(null); setAppealReason('') }}>
              取消
            </Button>
            <Button
              className="bg-coral text-white hover:bg-coral-dark"
              disabled={isAppealSubmitting || !appealReason.trim()}
              onClick={() => void handleSubmitAppeal()}
            >
              {isAppealSubmitting ? '提交中...' : '提交申诉'}
            </Button>
          </>
        )}
      >
        <Textarea
          value={appealReason}
          maxLength={500}
          onChange={(event) => setAppealReason(event.target.value)}
          className="min-h-24"
          placeholder="申诉理由（必填，最多500字）"
          aria-label="申诉理由"
        />
      </AppDialog>

      {/* ─── 注销账号确认（软注销，不可逆） ─── */}
      <ConfirmDialog
        open={pendingDeactivate}
        title="确定注销账号？"
        description="注销后你的全部分享将不可见、账号无法登录，且不可恢复。"
        confirmText="确认注销"
        destructive
        isSubmitting={isDeactivating}
        onConfirm={() => void handleConfirmDeactivate()}
        onCancel={() => setPendingDeactivate(false)}
      />

      {/* ─── 收藏夹管理（G7） ─── */}
      <FavoriteFolderManager
        isOpen={isFolderManagerOpen}
        onChanged={() => void loadFolders()}
        onClose={() => setIsFolderManagerOpen(false)}
      />
    </div>
  )
}
