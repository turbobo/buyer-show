// 话题广场（G10）：运营话题列表，点击进入话题聚合流
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Hash } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { getTopics, type ApiTopic } from '@/services/operations'

export default function TopicsScreen() {
  const navigate = useNavigate()
  const [topics, setTopics] = useState<ApiTopic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setTopics(await getTopics())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载话题失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" aria-label="返回" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">话题广场</h1>
          <span className="ml-auto text-xs text-muted-foreground">{topics.length} 个话题</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : topics.length === 0 ? (
          <EmptyState
            icon={Hash}
            title="暂无运营话题"
            description="运营同学会定期创建话题，敬请期待"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => navigate(`/topics/${topic.id}`)}
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 text-left transition-colors hover:border-coral/50"
              >
                {topic.coverUrl ? (
                  <img
                    src={topic.coverUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-coral-light">
                    <Hash className="h-6 w-6 text-coral" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold group-hover:text-coral">#{topic.name}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {topic.description ?? '一起来分享好物吧'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{topic.postCount} 篇分享</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
