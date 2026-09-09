import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { login, register } from '@/services/auth'

export default function LoginScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const safeRedirect = redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
  const [isRegistering, setIsRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      if (isRegistering) await register(username, password, nickname)
      else await login(username, password)
      navigate(safeRedirect)
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '认证失败') } finally { setIsSubmitting(false) }
  }

  return <main className="flex min-h-screen items-center justify-center bg-warm-bg p-4"><section className="w-full max-w-sm space-y-5 rounded-2xl border border-border/60 bg-white p-6 shadow-sm"><div><p className="text-sm font-semibold text-coral">买家说</p><h1 className="mt-1 text-2xl font-bold">{isRegistering ? '创建账号' : '欢迎回来'}</h1></div><Input aria-label="用户名" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="用户名" autoComplete="username" />{isRegistering && <Input aria-label="昵称" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="昵称" autoComplete="nickname" />}<Input aria-label="密码" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="密码" type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} />{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full bg-coral text-white hover:bg-coral-dark" disabled={isSubmitting} onClick={() => void handleSubmit()}>{isSubmitting ? '提交中...' : isRegistering ? '注册并登录' : '登录'}</Button><button type="button" className="w-full text-sm text-coral" onClick={() => setIsRegistering((current) => !current)}>{isRegistering ? '已有账号？去登录' : '没有账号？去注册'}</button></section></main>
}
