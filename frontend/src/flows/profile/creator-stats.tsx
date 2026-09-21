// 创作数据（G9）：本人帖子的阅读/点赞/收藏/评论反馈——概览卡片 + 逐日趋势柱状图 + Top 帖榜单
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BarChart3, Eye, Heart, Home, Loader2, MessageSquare, Star } from 'lucide-react'
import { smartBack } from '@/lib/smart-back'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/error-state'
import { getCreatorStats, type CreatorStats, type CreatorTrendPoint } from '@/services/users'

type TrendMetric = 'views' | 'likes' | 'favorites' | 'comments'

const METRIC_OPTIONS: { key: TrendMetric; label: string }[] = [
  { key: 'views', label: '阅读' },
  { key: 'likes', label: '点赞' },
  { key: 'favorites', label: '收藏' },
  { key: 'comments', label: '评论' },
]

function formatCount(value: number): string {
  return value.toLocaleString('zh-CN')
}

/** 柱状图 x 轴标签：7 天全部显示 MM-DD，30 天每 5 天显示一次。 */
function axisLabel(date: string, index: number, total: number): string {
  const monthDay = date.slice(5)
  if (total <= 7) return monthDay
  return index % 5 === 0 ? monthDay : ''
}

function TrendChart({ trend, metric }: { trend: CreatorTrendPoint[]; metric: TrendMetric }) {
  const max = Math.max(1, ...trend.map((point) => point[metric]))
  return (
    <div>
      <div className="flex h-40 items-end gap-1 md:h-48 md:gap-2">
        {trend.map((point, index) => {
          const value = point[metric]
          const heightPct = Math.max(value === 0 ? 2 : (value / max) * 100, 2)
          return (
            <div
              key={point.date}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
              title={`${point.date}：${formatCount(value)}`}
            >
              <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 md:text-xs">
                {value > 0 ? formatCount(value) : ''}
              </span>
              <div
                className={`w-full max-w-7 rounded-t-md transition-colors ${
                  value === 0 ? 'bg-border/60' : 'bg-coral/80 group-hover:bg-coral'
                }`}
                style={{ height: `${heightPct}%` }}
                role="img"
                aria-label={`${point.date} ${metric} ${value}`}
              />
              <span className="truncate text-[10px] text-muted-foreground">
                {axisLabel(point.date, index, trend.length)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 创作数据页内容（直链页外壳包裹）。 */
function CreatorStatsContent() {
  const navigate = useNavigate()
  const [days, setDays] = useState<7 | 30>(7)
  const [metric, setMetric] = useState<TrendMetric>('views')
  const [stats, setStats] = useState<CreatorStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (windowDays: 7 | 30) => {
    setIsLoading(true)
    setError(null)
    try {
      setStats(await getCreatorStats(windowDays))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load(days) }, [load, days])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (error || !stats) return <ErrorState message={error ?? '数据加载失败'} onRetry={() => void load(days)} />

  const { summary, trend, topPosts } = stats
  // 后端逐日补零（长度恒为窗口天数），按是否有互动判断空态
  const hasActivity = trend.some(
    (point) => point.views > 0 || point.likes > 0 || point.favorites > 0 || point.comments > 0,
  )
  const summaryCards: { label: string; value: number; icon: typeof Eye; hint: string }[] = [
    { label: '发布帖子', value: summary.postCount, icon: BarChart3, hint: '全部未删除帖子' },
    { label: '阅读量', value: summary.totalViews, icon: Eye, hint: `近 ${days} 天` },
    { label: '获赞', value: summary.totalLikes, icon: Heart, hint: '累计' },
    { label: '被收藏', value: summary.totalFavorites, icon: Star, hint: '累计' },
    { label: '评论', value: summary.totalComments, icon: MessageSquare, hint: '累计' },
  ]

  return (
    <div className="space-y-6">
      {/* 窗口切换 */}
      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        {([7, 30] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setDays(option)}
            className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
              days === option ? 'bg-coral text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            近 {option} 天
          </button>
        ))}
      </div>

      {/* 概览卡片 */}
      <section aria-label="创作数据概览" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <card.icon className="h-3.5 w-3.5" />
              {card.label}
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">{formatCount(card.value)}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground/80">{card.hint}</div>
          </div>
        ))}
      </section>

      {/* 趋势柱状图 */}
      <section aria-label="互动趋势" className="rounded-xl border border-border/60 bg-card p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">互动趋势</h2>
          <div className="inline-flex rounded-lg bg-muted p-1">
            {METRIC_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setMetric(option.key)}
                className={`rounded-md px-3 py-1 text-xs transition-colors ${
                  metric === option.key ? 'bg-card font-medium text-coral shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {!hasActivity ? (
          <p className="py-10 text-center text-sm text-muted-foreground">暂无互动数据</p>
        ) : (
          <TrendChart trend={trend} metric={metric} />
        )}
      </section>

      {/* Top 帖 */}
      <section aria-label="热门帖子" className="rounded-xl border border-border/60 bg-card p-4 md:p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">热门帖子 Top 5</h2>
        {topPosts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">近 {days} 天暂无帖子被浏览</p>
        ) : (
          <ol className="divide-y divide-border/50">
            {topPosts.map((post, index) => (
              <li key={post.postId} className="flex items-center gap-3 py-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    index < 3 ? 'bg-coral/15 text-coral' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => navigate(`/posts/${post.postId}`, { state: { modal: true } })}
                  className="min-w-0 flex-1 truncate text-left text-sm text-foreground hover:text-coral"
                >
                  {post.title ?? '（无标题）'}
                </button>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title="近 N 天阅读">
                  <Eye className="h-3.5 w-3.5" />
                  {formatCount(post.views)}
                </span>
                <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex" title="累计获赞">
                  <Heart className="h-3.5 w-3.5" />
                  {formatCount(post.likeCount)}
                </span>
                <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex" title="累计被收藏">
                  <Star className="h-3.5 w-3.5" />
                  {formatCount(post.favoriteCount)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

/** 直链页（/profile/creator-stats）：创作数据（G9）。 */
export default function CreatorStatsScreen() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background">
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
          <h1 className="flex-1 truncate text-lg font-bold text-foreground">创作数据</h1>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 hidden items-center gap-3 md:flex">
          <Button aria-label="返回上一页" variant="ghost" size="icon" onClick={() => smartBack()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">创作数据</h1>
        </div>
        <CreatorStatsContent />
      </main>
    </div>
  )
}
