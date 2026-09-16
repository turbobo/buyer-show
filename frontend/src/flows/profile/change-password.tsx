// 修改密码页：登录态下校验旧密码后更新（Stack 导航仅移动端；PC 底部右对齐保存）
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import { smartBack } from '@/lib/smart-back'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { changePassword } from '@/services/auth'

export default function ChangePasswordScreen() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const validate = (): string | null => {
    if (!currentPassword) return '请输入当前密码'
    if (newPassword.length < 6) return '新密码至少 6 位'
    if (newPassword === currentPassword) return '新密码不能与当前密码相同'
    if (confirmPassword !== newPassword) return '两次输入的新密码不一致'
    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setIsSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast('success', '密码已更新')
      navigate('/profile')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '修改失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  const navBar = (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <div className="flex items-center gap-1 -ml-3">
          <Button aria-label="返回上一页" variant="ghost" size="icon" onClick={() => smartBack()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button aria-label="返回首页" variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/')}>
            <Home className="h-5 w-5" />
          </Button>
        </div>
        <h1 className="flex-1 truncate text-lg font-bold text-foreground">修改密码</h1>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-background">
      {navBar}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <section className="mx-auto max-w-3xl space-y-5">
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
          )}
          <div>
            <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium">当前密码</label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="请输入当前密码"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium">新密码</label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="至少 6 位"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium">确认新密码</label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="再次输入新密码"
            />
          </div>
          {/* PC：右对齐保存 */}
          <div className="hidden justify-end md:flex">
            <Button
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="min-w-28 bg-coral text-white hover:bg-coral-dark"
            >
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
          {/* 移动端：底部全宽保存 */}
          <div className="md:hidden">
            <Button
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="w-full bg-coral text-white hover:bg-coral-dark"
            >
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
