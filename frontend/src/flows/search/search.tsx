// 搜索页：关键词输入 + 搜索历史/热门推荐 + 结果列表（Flow 1 Screen 2）
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Clock, Home, Loader2, Search as SearchIcon, Trash2, TrendingUp } from 'lucide-react'
import { smartBack } from '@/lib/smart-back'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  addSearchHistory,
  clearSearchHistory,
  getHotTags,
  getSearchHistory,
  searchPosts,
} from '@/services/search'
import type { ApiPostSummary } from '@/services/posts'

function postCover(post: ApiPostSummary): string | null {
  const image = post.thumbnails?.[0] ?? post.images[0]
  return image?.startsWith('http') ? image : null
}

export default function SearchScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [input, setInput] = useState(params.get('q') ?? '')
  const [results, setResults] = useState<ApiPostSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [hotTags, setHotTags] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>(() => getSearchHistory())

  const runSearch = useCallback(async (keyword: string) => {
    const trimmed = keyword.trim()
    if (!trimmed) return
    addSearchHistory(trimmed)
    setHistory(getSearchHistory())
    setInput(trimmed)
    setParams({ q: trimmed }, { replace: true })
    setSearched(true)
    setIsLoading(true)
    setError(null)
    try {
      setResults(await searchPosts(trimmed, 30))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '搜索失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }, [setParams])

  // 首次进入：加载热门标签 + 处理 URL 中的 q
  useEffect(() => {
    getHotTags()
      .then(setHotTags)
      .catch(() => { /* 热门标签加载失败时保持隐藏 */ })
    const initialQ = params.get('q')
    if (initialQ) {
      void runSearch(initialQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* ─── 顶部导航（含搜索输入） ─── */}
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
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              autoFocus
              aria-label="搜索关键词"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void runSearch(input)
              }}
              placeholder="搜索好物、品牌、标签..."
              className="h-10 rounded-full border-0 bg-muted/50 pl-10"
            />
          </div>
          <Button variant="ghost" size="sm" className="shrink-0 text-coral" onClick={() => void runSearch(input)}>
            搜索
          </Button>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {!searched ? (
          <div className="space-y-6">
            {history.length > 0 && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    搜索历史
                  </h2>
                  <button
                    type="button"
                    onClick={() => { clearSearchHistory(); setHistory([]) }}
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    清空
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => void runSearch(item)}
                      className="rounded-full bg-muted px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-muted/80"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {hotTags.length > 0 && (
              <section>
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  热门搜索
                </h2>
                <div className="flex flex-wrap gap-2">
                  {hotTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => void runSearch(tag)}
                      className="rounded-full bg-coral-light px-3 py-1.5 text-xs text-coral transition-colors hover:bg-coral-light/80"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-card p-6 text-center">
            <p className="mb-3 text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => void runSearch(input)}>重新搜索</Button>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl bg-card p-12 text-center">
            <p className="mb-1 text-sm text-muted-foreground">没有找到与「{input}」相关的内容</p>
            <p className="text-xs text-muted-foreground">换个关键词试试吧</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">找到 {results.length} 条相关分享</p>
            {results.map((post) => {
              const cover = postCover(post)
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => navigate(`/posts/${post.id}`, { state: { modal: true } })}
                  className="flex w-full gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-coral/20 hover:shadow-sm"
                >
                  {cover ? (
                    <img src={cover} alt={post.title} loading="lazy" className="h-20 w-20 shrink-0 rounded-lg bg-muted object-cover" />
                  ) : (
                    <div className="h-20 w-20 shrink-0 rounded-lg bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm font-medium leading-relaxed text-foreground">{post.title}</h3>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="bg-coral-light text-[8px] font-bold text-coral">
                          {post.userNickname[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-24 truncate">{post.userNickname}</span>
                      <span>· {post.likeCount} 赞</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
