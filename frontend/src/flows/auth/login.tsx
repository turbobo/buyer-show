import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { login, register } from '@/services/auth'
import { useToast } from '@/components/ui/toast'

const PHONE_REGEX = /^1[3-9]\d{9}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginScreen() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const safeRedirect = redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
  const [isRegistering, setIsRegistering] = useState(false)
  const [account, setAccount] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateRegisterInput = (): string | null => {
    if (!nickname.trim()) return '请填写昵称'
    if (phone.trim() && !PHONE_REGEX.test(phone.trim())) return '手机号格式不正确'
    if (email.trim() && !EMAIL_REGEX.test(email.trim())) return '邮箱格式不正确'
    return null
  }

  const handleSubmit = async () => {
    if (isRegistering) {
      const validationError = validateRegisterInput()
      if (validationError) { setError(validationError); return }
    }
    setIsSubmitting(true)
    setError(null)
    try {
      if (isRegistering) {
        await register({
          username: account.trim(),
          password,
          nickname: nickname.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
        })
        toast('success', '注册成功，欢迎加入买家说！')
      } else {
        await login(account.trim(), password)
        toast('success', '登录成功')
      }
      navigate(safeRedirect)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '认证失败'
      setError(message)
      toast('error', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-warm-bg p-4">
      <section className="w-full max-w-sm space-y-5 rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
        <div>
          <img src="/favicon.svg" alt="" className="mb-2 h-10 w-10" />
          <p className="text-sm font-semibold text-coral">买家说</p>
          <h1 className="mt-1 text-2xl font-bold">{isRegistering ? '创建账号' : '欢迎回来'}</h1>
        </div>
        <Input
          aria-label="账号"
          value={account}
          onChange={(event) => setAccount(event.target.value)}
          placeholder={isRegistering ? '用户名（3-50字符）' : '用户名/手机号/邮箱'}
          autoComplete="username"
        />
        {isRegistering && (
          <Input
            aria-label="昵称"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="昵称"
            autoComplete="nickname"
          />
        )}
        <Input
          aria-label="密码"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="密码（至少6位）"
          type="password"
          autoComplete={isRegistering ? 'new-password' : 'current-password'}
        />
        {isRegistering && (
          <Input
            aria-label="手机号（选填）"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="手机号（选填，登录时可用）"
            autoComplete="tel"
          />
        )}
        {isRegistering && (
          <Input
            aria-label="邮箱（选填）"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="邮箱（选填，登录时可用）"
            autoComplete="email"
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          className="w-full bg-coral text-white hover:bg-coral-dark"
          disabled={isSubmitting}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting ? '提交中...' : isRegistering ? '注册并登录' : '登录'}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-coral"
          onClick={() => setIsRegistering((current) => !current)}
        >
          {isRegistering ? '已有账号？去登录' : '没有账号？去注册'}
        </button>
      </section>
    </main>
  )
}
