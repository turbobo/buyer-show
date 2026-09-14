import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { login, register } from '@/services/auth'
import { trackLogin, trackRegister } from '@/services/analytics'
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
        trackLogin('password')
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* 背景装饰 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-coral/5 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-coral/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/4 h-40 w-40 -translate-x-1/2 rounded-full bg-coral-light/50 blur-2xl" />
      </div>

      <section className="relative z-10 w-full max-w-sm space-y-6 rounded-2xl border border-border/60 bg-card/95 p-8 shadow-xl backdrop-blur-sm">
        {/* 品牌区域 */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-coral to-coral-dark shadow-lg shadow-coral/30">
            <img src="/favicon.svg" alt="" className="h-10 w-10" />
          </div>
          <p className="text-sm font-semibold text-coral">买家说</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {isRegistering ? '创建你的账号' : '欢迎回来'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isRegistering ? '加入购物分享社区，发现真实好物' : '登录继续你的购物分享之旅'}
          </p>
        </div>

        {/* 表单 */}
        <div className="space-y-3">
          <Input
            aria-label="账号"
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            placeholder={isRegistering ? '用户名（3-50字符）' : '用户名/手机号/邮箱'}
            autoComplete="username"
            className="h-11"
          />
          {isRegistering && (
            <Input
              aria-label="昵称"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="昵称"
              autoComplete="nickname"
              className="h-11"
            />
          )}
          <Input
            aria-label="密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="密码（至少6位）"
            type="password"
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
            className="h-11"
          />
          {isRegistering && (
            <>
              <Input
                aria-label="手机号（选填）"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="手机号（选填，登录时可用）"
                autoComplete="tel"
                className="h-11"
              />
              <Input
                aria-label="邮箱（选填）"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="邮箱（选填，登录时可用）"
                autoComplete="email"
                className="h-11"
              />
            </>
          )}
        </div>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          className="h-11 w-full rounded-full bg-coral text-white hover:bg-coral-dark"
          disabled={isSubmitting}
        >
          {isSubmitting ? '提交中...' : isRegistering ? '注册并登录' : '登录'}
        </Button>

        <div className="text-center">
          <button
            type="button"
            className="text-sm text-coral hover:underline"
            onClick={() => setIsRegistering((current) => !current)}
          >
            {isRegistering ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </div>
        </form>
      </section>
    </main>
  )
}
