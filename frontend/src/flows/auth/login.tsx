import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { login, register, getCaptcha, type CaptchaData } from '@/services/auth'
import { ApiError } from '@/services/http'
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
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null)
  const [captchaCode, setCaptchaCode] = useState('')
  const [showLoginCaptcha, setShowLoginCaptcha] = useState(false)

  const reloadCaptcha = useCallback(async () => {
    try {
      setCaptcha(await getCaptcha())
    } catch {
      /* 拉取失败时保持空态，提交前会提示 */
    }
  }, [])

  // 注册模式立即展示验证码
  useEffect(() => {
    if (isRegistering) {
      setCaptchaCode('')
      void reloadCaptcha()
    }
  }, [isRegistering, reloadCaptcha])

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
      if (!captcha) { setError('验证码加载中，请点击图片重试'); return }
      if (!captchaCode.trim()) { setError('请输入验证码'); return }
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
          captchaId: captcha?.captchaId ?? '',
          captchaCode: captchaCode.trim(),
        })
        toast('success', '注册成功，欢迎加入买家说！')
      } else {
        await login(
          account.trim(),
          password,
          showLoginCaptcha && captcha ? { captchaId: captcha.captchaId, captchaCode: captchaCode.trim() } : undefined,
        )
        trackLogin('password')
        toast('success', '登录成功')
      }
      navigate(safeRedirect)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '认证失败'
      const code = requestError instanceof ApiError ? requestError.code : undefined
      if (!isRegistering && code === 1009) {
        // 连续失败达阈值，要求验证码
        setShowLoginCaptcha(true)
        setCaptchaCode('')
        void reloadCaptcha()
        setError('登录尝试次数较多，请输入验证码后重试')
      } else {
        setError(message)
        // 验证码错误或注册失败时刷新验证码（一次性消费）
        if (code === 1010 || isRegistering) {
          setCaptchaCode('')
          void reloadCaptcha()
        }
      }
      toast('error', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* 返回首页（登录页不拦截浏览，游客可随时回首页；几何与全局 Stack 导航一致） */}
      <div className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
          <Button aria-label="返回首页" variant="ghost" size="icon" className="-ml-3" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </div>

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
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
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
          {!isRegistering && showLoginCaptcha && (
            <div className="flex items-center gap-2">
              <Input
                aria-label="验证码"
                value={captchaCode}
                onChange={(event) => setCaptchaCode(event.target.value)}
                placeholder="验证码（不区分大小写）"
                maxLength={4}
                autoComplete="off"
                className="h-11 flex-1"
              />
              {captcha && (
                <img
                  src={captcha.image}
                  alt="验证码，点击刷新"
                  title="点击刷新"
                  onClick={() => { setCaptchaCode(''); void reloadCaptcha() }}
                  className="h-11 w-[120px] shrink-0 cursor-pointer rounded-lg border border-border/60"
                />
              )}
            </div>
          )}
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
              <div className="flex items-center gap-2">
                <Input
                  aria-label="验证码"
                  value={captchaCode}
                  onChange={(event) => setCaptchaCode(event.target.value)}
                  placeholder="验证码（不区分大小写）"
                  maxLength={4}
                  autoComplete="off"
                  className="h-11 flex-1"
                />
                {captcha && (
                  <img
                    src={captcha.image}
                    alt="验证码，点击刷新"
                    title="点击刷新"
                    onClick={() => { setCaptchaCode(''); void reloadCaptcha() }}
                    className="h-11 w-[120px] shrink-0 cursor-pointer rounded-lg border border-border/60"
                  />
                )}
              </div>
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
