import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { getAccessToken } from '@/services/http'
import { getCurrentUserProfile, type UserProfile } from '@/services/auth'

/** 当前登录用户资料的共享缓存键（P4.1：全站单一事实源） */
export const ME_QUERY_KEY = ['me'] as const

/**
 * 当前登录用户资料（全站共享单一缓存）。
 * 未登录（无 token）时禁用请求；登出必须调用 clearSessionCache 清缓存，
 * 否则禁用态仍会返回上个会话的缓存数据。
 */
export function useMe() {
  const { data, ...rest } = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getCurrentUserProfile,
    enabled: getAccessToken() != null,
    staleTime: 60_000,
  })
  return { ...rest, currentUser: data ?? null }
}

/**
 * 会话缓存操作集合：
 * - setMe：编辑资料成功后用返回值覆盖缓存（Header/UserMenu 即时同步）
 * - invalidateMe：标记失效，下一次 useMe 重新拉取（登录后调用）
 * - clearSessionCache：登出时清空全部查询缓存，避免用户数据跨会话泄漏
 */
export function useSessionCache() {
  const queryClient = useQueryClient()
  return {
    setMe: (profile: UserProfile) => queryClient.setQueryData(ME_QUERY_KEY, profile),
    invalidateMe: () => queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
    clearSessionCache: () => queryClient.clear(),
  }
}

/** 非组件场景（如 profile 页数据流内）复用 me 缓存：fresh 时强制重拉（结果仍回写共享缓存，同步 Header） */
export function fetchMe(queryClient: QueryClient, opts: { fresh?: boolean } = {}): Promise<UserProfile> {
  return queryClient.fetchQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: getCurrentUserProfile,
    staleTime: opts.fresh ? 0 : 60_000,
  })
}
