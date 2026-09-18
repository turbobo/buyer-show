import { ArrowLeft, Check, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { smartBack } from '@/lib/smart-back'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/* ─── 发布结果页（成功 / 审核提示后 1.2s 跳转） ─── */
export function PublishResult({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-xl font-bold">{message}</h1>
      </div>
    </div>
  )
}

/* ─── 编辑模式初始化骨架屏（加载原帖回填期间） ─── */
export function PublishInitializing() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl md:top-14">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <div className="flex items-center gap-1 -ml-3">
            <Button aria-label="返回上一页" variant="ghost" size="icon" onClick={() => smartBack()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button aria-label="返回首页" variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/')}>
              <Home className="h-5 w-5" />
            </Button>
          </div>
          <h1 className="flex-1 truncate text-lg font-bold text-foreground">编辑分享</h1>
        </div>
      </nav>
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-2xl" />
        ))}
      </main>
    </div>
  )
}
