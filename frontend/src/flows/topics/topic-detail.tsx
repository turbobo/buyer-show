// 话题详情页（G10）：运营话题聚合流——按话题名作为标签复用 Feed 查询
import { useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { ArrowLeft, Hash } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { getFeed } from '@/services/posts'
import { getTopic, type ApiTopic } from '@/services/operations'
import { PostCard } from '@/flows/home-feed/post-card'

export default function TopicDetailScreen() {
  const { topicId } = useParams<{ topicId: string }>()
  const navigate = useNavigate()
  const [topic, setTopic] = useState<ApiTopic | null>(null)
  const [topicError, setTopicError] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // 话题元信息（名称是 Feed 查询的关键输入）
  useEffect(() => {
    if (!topicId) return
    getTopic(topicId)
      .then(setTopic)
      .catch((requestError) => {
        setTopicError(requestError instanceof Error ? requestError.message : '话题不存在')
      })
  }, [topicId])

  // 话题聚合流：tag=话题名，最新排序，游标分页
  const feedQuery = useInfiniteQuery({
    queryKey: ['topic-feed', topic?.name] as const,
    queryFn: ({ pageParam, signal }) => getFeed(pageParam, topic?.name, 'new', 'all', signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled: topic != null,
  })
  const posts = useMemo(() => feedQuery.data?.pages.flatMap((page) => page.list) ?? [], [feedQuery.data])

  // 触底加载更多
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el || !feedQuery.hasNextPage || feedQuery.isPlaceholderData) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !feedQuery.isFetchingNextPage) {
          void feedQuery.fetchNextPage()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [feedQuery.hasNextPage, feedQuery.isFetchingNextPage, feedQuery.isPlaceholderData, feedQuery.fetchNextPage])

  const feedError = feedQuery.error instanceof Error ? feedQuery.error.message : null
  const isInitialLoading = topic == null && !topicError

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" aria-label="返回" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-lg font-bold">{topic ? `#${topic.name}` : '话题'}</h1>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {topic ? `${topic.postCount} 篇分享` : ''}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {topicError && <ErrorState message={topicError} onRetry={() => navigate(-1)} />}
        {!topicError && topic && topic.description && (
          <p className="mb-4 rounded-xl bg-card p-4 text-sm text-muted-foreground">{topic.description}</p>
        )}
        {isInitialLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-xl" />
            ))}
          </div>
        )}
        {feedError && <ErrorState message={feedError} onRetry={() => void feedQuery.refetch()} />}
        {!isInitialLoading && !feedError && posts.length === 0 && (
          <EmptyState
            icon={Hash}
            title="话题下还没有分享"
            description="带上话题标签发一篇好物分享吧"
          />
        )}
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
        {feedQuery.hasNextPage && (
          <div ref={loadMoreRef} className="py-8 text-center">
            {feedQuery.isFetchingNextPage && <span className="text-sm text-muted-foreground">加载中...</span>}
          </div>
        )}
      </main>
    </div>
  )
}
