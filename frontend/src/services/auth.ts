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
  captchaId: string
  captchaCode: string
}

export interface CaptchaData {
  captchaId: string
  image: string
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

export async function login(account: string, password: string, captcha?: { captchaId: string; captchaCode: string }): Promise<void> {
  const tokens = await request<TokenPair>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: account, password, ...captcha }),
  })
  saveTokens(tokens.accessToken, tokens.refreshToken)
}

/** 获取图形验证码（注册必用；登录连续失败后使用）。 */
export async function getCaptcha(): Promise<CaptchaData> {
  return request<CaptchaData>('/auth/captcha')
}

export async function register(payload: RegisterPayload): Promise<void> {
  const tokens = await request<TokenPair>('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
  saveTokens(tokens.accessToken, tokens.refreshToken)
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request<void>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function getCurrentUserProfile(): Promise<UserProfile> {
  return request<UserProfile>('/users/me')
}
