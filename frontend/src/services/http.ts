export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
const ACCESS_TOKEN_KEY = 'buyer-show.access-token'
const REFRESH_TOKEN_KEY = 'buyer-show.refresh-token'
const REFRESH_AHEAD_SECONDS = 30

let refreshPromise: Promise<string | null> | null = null

export class ApiError extends Error {
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function decodeTokenPayload(token: string): { role?: string; exp?: number } | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
    return JSON.parse(atob(padded)) as { role?: string; exp?: number }
  } catch {
    return null
  }
}

export function getTokenRole(): string | null {
  const token = getAccessToken()
  return token ? decodeTokenPayload(token)?.role ?? null : null
}

function shouldRefresh(token: string): boolean {
  const exp = decodeTokenPayload(token)?.exp
  return exp == null || exp <= Math.floor(Date.now() / 1000) + REFRESH_AHEAD_SECONDS
}

async function performRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) return null

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const payload = await response.json() as ApiResponse<{ accessToken: string; refreshToken: string }>
    if (!response.ok || payload.code !== 0) {
      clearTokens()
      return null
    }
    saveTokens(payload.data.accessToken, payload.data.refreshToken)
    return payload.data.accessToken
  } catch {
    clearTokens()
    return null
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

export async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  return requestWithHeaders<T>(path, { ...options, headers }, retried)
}

export async function upload<T>(path: string, formData: FormData, retried = false): Promise<T> {
  return requestWithHeaders<T>(path, { method: 'POST', body: formData }, retried, true)
}

async function requestWithHeaders<T>(path: string, options: RequestInit, retried: boolean, isFormData = false): Promise<T> {
  const headers = new Headers(options.headers)
  let accessToken = getAccessToken()
  if (accessToken && shouldRefresh(accessToken) && !path.startsWith('/auth/')) {
    accessToken = await refreshAccessToken()
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (!isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  if (response.status === 401 && !retried && !path.startsWith('/auth/')) {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) {
      if (isFormData && options.body instanceof FormData) return upload<T>(path, options.body, true)
      return requestWithHeaders<T>(path, options, true, isFormData)
    }
  }

  let payload: ApiResponse<T>
  try {
    payload = await response.json() as ApiResponse<T>
  } catch {
    throw new ApiError(response.status, `服务响应异常（HTTP ${response.status}）`)
  }
  if (!response.ok || payload.code !== 0) throw new ApiError(payload.code, payload.message)
  return payload.data
}
