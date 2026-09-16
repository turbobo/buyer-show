import { request } from './http'
import type { ApiPostSummary } from './posts'

export function searchPosts(keyword: string, limit = 20): Promise<ApiPostSummary[]> {
  return request<ApiPostSummary[]>(`/posts/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`)
}

export function getHotTags(): Promise<string[]> {
  return request<string[]>('/posts/search/hot-tags')
}

export function getSuggestions(prefix: string): Promise<string[]> {
  return request<string[]>(`/posts/search/suggest?prefix=${encodeURIComponent(prefix)}`)
}

const SEARCH_HISTORY_KEY = 'buyer-show.search-history'
const MAX_HISTORY = 10

/** 本地搜索历史（最多 10 条，去重，最新在前）。 */
export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function addSearchHistory(keyword: string): void {
  const trimmed = keyword.trim()
  if (!trimmed) return
  const next = [trimmed, ...getSearchHistory().filter((item) => item !== trimmed)].slice(0, MAX_HISTORY)
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next))
}

export function clearSearchHistory(): void {
  localStorage.removeItem(SEARCH_HISTORY_KEY)
}
