import { request, saveTokens } from './http'

interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface RegisterPayload {
  username: string
  password: string
  nickname: string
  phone?: string
  email?: string
}

export interface UserProfile {
  id: number
  username: string
  nickname: string
  avatarUrl: string | null
  bio: string | null
  postCount: number
  followerCount: number
  followingCount: number
  isFollowing: boolean
}

export async function login(account: string, password: string): Promise<void> {
  const tokens = await request<TokenPair>('/auth/login', { method: 'POST', body: JSON.stringify({ username: account, password }) })
  saveTokens(tokens.accessToken, tokens.refreshToken)
}

export async function register(payload: RegisterPayload): Promise<void> {
  const tokens = await request<TokenPair>('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
  saveTokens(tokens.accessToken, tokens.refreshToken)
}

export async function getCurrentUserProfile(): Promise<UserProfile> {
  return request<UserProfile>('/users/me')
}
