import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, FileText, Heart, MessageSquare, PenSquare, ThumbsUp, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { request } from '@/services/http'
import { getPendingCounts, type PendingCounts } from '@/services/admin'

interface OverviewData {
  todayActiveUsers: number
  yesterdayActiveUsers: number
  last7DaysActiveUsers: number
  last30DaysActiveUsers: number
  todayEvents: Array<{ event_type: string; count: number }>
}

interface TopPost {
  post_id: number
  view_count: number
}

interface TrendPoint {
  date: string
  count: number
}

const RANGE_OPTIONS = [
  { days: 7, label: '近 7 天' },
  { days: 30, label: '近 30 天' },
] as const

const INTERACTION_EVENTS = ['post_like', 'comment_create', 'post_favorite']

function sumEvents(overview: OverviewData | null, types: string[]): number {
  if (!overview?.todayEvents) return 0
  return overview.todayEvents
    .filter((event) => types.includes(event.event_type))
    .reduce((sum, event) => sum + event.count, 0)
}

/** 轻量 SVG 折线图（按住圆点可查看精确数值） */
function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">暂无数据</p>
  }
  const width = 620
  const height = 160
  const pad = 16
  const max = Math.max(...points.map((point) => point.count), 1)
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0
  const coords = points.map((point, index) => ({
    ...point,
    x: pad + index * step,
    y: height - pad - (point.count / max) * (height - pad * 2),
  }))
  const polyline = coords.map((coord) => `${coord.x},${coord.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label="浏览趋势折线图">
      <polyline points={polyline} fill="none" className="stroke-coral" strokeWidth={2} strokeLinejoin="round" />
      {coords.map((coord) => (
        <circle key={coord.date} cx={coord.x} cy={coord.y} r={3.5} className="fill-coral">
          <title>{`${coord.date}：${coord.count}`}</title>
        </circle>
      ))}
    </svg>
  )
}

export default function AdminAnalytics() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [topPosts, setTopPosts] = useState<TopPost[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [hotTags, setHotTags] = useState<string[]>([])
  const [counts, setCounts] = useState<PendingCounts | null>(null)
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (rangeDays: number) => {
    setLoading(true)
    setError(null)
    try {
      const [overviewData, topPostsData, trendData, tagsData, countsData] = await Promise.all([
        request<OverviewData>('/analytics/overview'),
        request<TopPost[]>(`/analytics/top-posts?days=${rangeDays}&limit=10`),
        request<TrendPoint[]>(`/analytics/trend?eventType=post_view&days=${rangeDays}`),
        request<string[]>('/posts/search/hot-tags?limit=10'),
        getPendingCounts(),
      ])
      setOverview(overviewData)
      setTopPosts(topPostsData)
      setTrend(trendData)
      setHotTags(tagsData)
      setCounts(countsData)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '加载看板数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(days) }, [load, days])

  if (error && !overview) {
    return (
      <div className="mx-auto max-w-sm space-y-3 rounded-2xl border border-destructive/30 bg-card p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => void load(days)}>重试</Button>
      </div>
    )
  }

  if (loading && !overview) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ─── 待办直达 ─── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/admin/moderation"
          className="rounded-xl border border-coral/30 bg-coral-light/60 p-4 transition-colors hover:border-coral"
        >
          <p className="text-sm font-medium text-coral">待审内容</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {(counts?.pendingPosts ?? 0) + (counts?.pendingComments ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            帖子 {counts?.pendingPosts ?? 0} · 评论 {counts?.pendingComments ?? 0}，去处理 →
          </p>
        </Link>
        <Link
          to="/admin/reports"
          className="rounded-xl border border-coral/30 bg-coral-light/60 p-4 transition-colors hover:border-coral"
        >
          <p className="text-sm font-medium text-coral">待处理举报</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{counts?.pendingReports ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">核实并处置 →</p>
        </Link>
      </div>

      {/* ─── KPI 卡片 ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今日活跃用户</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.todayActiveUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">昨日: {overview?.yesterdayActiveUsers ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">近7天活跃</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.last7DaysActiveUsers ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">近30天活跃</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.last30DaysActiveUsers ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今日发帖</CardTitle>
            <PenSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sumEvents(overview, ['post_create'])}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今日互动</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sumEvents(overview, INTERACTION_EVENTS)}</div>
            <p className="text-xs text-muted-foreground">点赞 + 评论 + 收藏</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今日浏览</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sumEvents(overview, ['post_view'])}</div>
          </CardContent>
        </Card>
      </div>

      {/* ─── 浏览趋势 ─── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>浏览趋势</CardTitle>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option.days}
                size="sm"
                variant={days === option.days ? 'default' : 'outline'}
                className={days === option.days ? 'bg-coral text-white hover:bg-coral-dark' : ''}
                onClick={() => setDays(option.days)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <TrendChart points={trend} />
        </CardContent>
      </Card>

      {/* ─── TOP 榜 ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>热门帖子（近 {days} 天）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPosts.map((post, index) => (
                <a
                  key={post.post_id}
                  href={`/posts/${post.post_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-coral/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-coral-light text-xs font-bold text-coral-contrast">
                      {index + 1}
                    </span>
                    <span className="text-sm">帖子 #{post.post_id}</span>
                  </div>
                  <span className="text-sm font-medium">{post.view_count} 次浏览 ↗</span>
                </a>
              ))}
              {topPosts.length === 0 && (
                <div className="text-sm text-muted-foreground">暂无数据</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>热门标签 TOP10</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {hotTags.map((tag, index) => (
                <span
                  key={tag}
                  className={`rounded-full px-3 py-1 text-sm ${
                    index < 3 ? 'bg-coral-light font-medium text-coral-contrast' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tag}
                </span>
              ))}
              {hotTags.length === 0 && (
                <span className="text-sm text-muted-foreground">暂无数据</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {error && overview && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
