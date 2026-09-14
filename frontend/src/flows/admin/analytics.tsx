import { useEffect, useState } from 'react'
import { ArrowLeft, TrendingUp, Users, Eye, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { smartBack } from '@/lib/smart-back'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { request } from '@/services/http'

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

export default function AdminAnalytics() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [topPosts, setTopPosts] = useState<TopPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewData, topPostsData] = await Promise.all([
          request<OverviewData>('/analytics/overview'),
          request<TopPost[]>('/analytics/top-posts?days=7&limit=10'),
        ])
        setOverview(overviewData)
        setTopPosts(topPostsData)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => smartBack()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">数据分析</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Overview Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">今日活跃用户</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.todayActiveUsers ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                昨日: {overview?.yesterdayActiveUsers ?? 0}
              </p>
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
              <CardTitle className="text-sm font-medium">今日事件数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overview?.todayEvents?.reduce((sum, e) => sum + e.count, 0) ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>今日事件分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overview?.todayEvents?.map((event) => (
                <div key={event.event_type} className="flex items-center justify-between">
                  <span className="text-sm">{event.event_type}</span>
                  <span className="text-sm font-medium">{event.count}</span>
                </div>
              ))}
              {(!overview?.todayEvents || overview.todayEvents.length === 0) && (
                <div className="text-sm text-muted-foreground">暂无数据</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Posts */}
        <Card>
          <CardHeader>
            <CardTitle>近7天热门帖子</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPosts.map((post, index) => (
                <div
                  key={post.post_id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-coral-light text-xs font-bold text-coral">
                      {index + 1}
                    </span>
                    <span className="text-sm">帖子 #{post.post_id}</span>
                  </div>
                  <span className="text-sm font-medium">{post.view_count} 次浏览</span>
                </div>
              ))}
              {topPosts.length === 0 && (
                <div className="text-sm text-muted-foreground">暂无数据</div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
