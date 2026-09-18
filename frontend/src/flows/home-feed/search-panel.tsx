import { useEffect, useState } from 'react'
import { Clock, Search, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  addSearchHistory,
  clearSearchHistory,
  getHotTags,
  getSearchHistory,
  getSuggestions,
} from '@/services/search'

/* ─── 搜索面板（真实数据：热门标签 / 联想 / 本地历史） ─── */
export function SearchPanel({ query, onClose }: { query: string; onClose: () => void }) {
  const navigate = useNavigate()
  const [hotTags, setHotTags] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>(() => getSearchHistory())

  // Escape 键关闭搜索面板
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // 热门搜索标签
  useEffect(() => {
    getHotTags()
      .then(setHotTags)
      .catch(() => { /* 加载失败时保持隐藏 */ })
  }, [])

  // 输入联想（防抖 300ms）
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSuggestions([])
      return
    }
    const timer = window.setTimeout(() => {
      getSuggestions(trimmed)
        .then(setSuggestions)
        .catch(() => setSuggestions([]))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const handleSearch = (keyword: string) => {
    const trimmed = keyword.trim()
    if (!trimmed) return
    addSearchHistory(trimmed)
    onClose()
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-2xl border border-border/60 bg-card p-4 shadow-lg">
      {/* 输入联想 */}
      {query.trim() ? (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            联想词
          </div>
          {suggestions.length > 0 ? (
            <div className="flex flex-col">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSearch(tag)}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-foreground/80 transition-colors hover:bg-muted/60"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  {tag}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleSearch(query)}
                className="mt-1 rounded-lg px-2 py-2 text-left text-sm text-coral-contrast transition-colors hover:bg-coral-light/50"
              >
                搜索「{query.trim()}」
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => handleSearch(query)}
              className="w-full rounded-lg px-2 py-2 text-left text-sm text-coral-contrast transition-colors hover:bg-coral-light/50"
            >
              搜索「{query.trim()}」
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 搜索历史 */}
          {history.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  搜索历史
                </span>
                <button
                  type="button"
                  onClick={() => { clearSearchHistory(); setHistory([]) }}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  清空
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSearch(tag)}
                    className="rounded-full bg-muted px-3 py-1 text-xs text-foreground/80 transition-colors hover:bg-muted/80"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 热门搜索 */}
          {hotTags.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                热门搜索
              </div>
              <div className="flex flex-wrap gap-2">
                {hotTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSearch(tag)}
                    className="rounded-full bg-coral-light px-3 py-1 text-xs text-coral-contrast transition-colors hover:bg-coral-light/80"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          {history.length === 0 && hotTags.length === 0 && (
            <p className="text-xs text-muted-foreground">输入关键词开始搜索</p>
          )}
        </>
      )}
    </div>
  )
}
