import { request, saveTokens } from './http'

interface TokenPair {
  accessToken: string
  refreshToken: string
}

export async function login(username: string, password: string): Promise<void> {
  const tokens = await request<TokenPair>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  saveTokens(tokens.accessToken, tokens.refreshToken)
}

export async function register(username: string, password: string, nickname: string): Promise<void> {
  const tokens = await request<TokenPair>('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, nickname }) })
  saveTokens(tokens.accessToken, tokens.refreshToken)
}
