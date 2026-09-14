import { request } from './http'
import type { ApiPostSummary } from './posts'

export function searchPosts(query: string, limit = 20): Promise<ApiPostSummary[]> {
  return request<ApiPostSummary[]>(`/search?q=${encodeURIComponent(query)}&limit=${limit}`)
}

export function getHotTags(): Promise<string[]> {
  return request<string[]>('/search/hot')
}

export function getSuggestions(prefix: string): Promise<string[]> {
  return request<string[]>(`/search/suggest?q=${encodeURIComponent(prefix)}`)
}
