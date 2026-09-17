import { request } from './http'

export interface TagStat {
  tag: string
  postCount: number
}

/** 热门标签聚合（公开；按使用量倒序）。 */
export function getHotTagStats(limit = 20): Promise<TagStat[]> {
  return request<TagStat[]>(`/tags?limit=${limit}`)
}
