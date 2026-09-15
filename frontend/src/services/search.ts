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
