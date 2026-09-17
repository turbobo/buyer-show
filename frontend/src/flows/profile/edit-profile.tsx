import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowLeft, Camera, Home, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/services/http'
import { getCurrentUserProfile, type UserProfile } from '@/services/auth'
import { updateProfile } from '@/services/users'
import { uploadImage, validateImageFile } from '@/services/uploads'
import { smartBack } from '@/lib/smart-back'

const NICKNAME_MAX = 20
const BIO_MAX = 100
const NICKNAME_EXISTS_CODE = 2003

/**
 * 资料编辑页（/profile/edit）。
 * 头像上传复用 /upload/image（选择后即时预览，保存时提交 URL）。
 */
export default function EditProfileScreen() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initial = useMemo(() => ({
    nickname: profile?.nickname ?? '',
    bio: profile?.bio ?? '',
    avatarUrl: profile?.avatarUrl ?? null,
  }), [profile])

  const isDirty = profile != null && (
    nickname.trim() !== initial.nickname
    || bio.trim() !== initial.bio
    || avatarUrl !== initial.avatarUrl
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await getCurrentUserProfile()
        if (cancelled) return
        setProfile(data)
        setNickname(data.nickname)
        setBio(data.bio ?? '')
        setAvatarUrl(data.avatarUrl)
      } catch (requestError) {
        if (!cancelled) {
          toast('error', requestError instanceof Error ? requestError.message : '加载资料失败')
          navigate('/profile', { replace: true })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  // 未保存时拦截刷新/关闭
  useEffect(() => {
    if (!isDirty) return
    const handler = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleBack = () => {
    if (isDirty) {
      setShowLeaveConfirm(true)
      return
    }
    smartBack()
  }

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const validationError = validateImageFile(file)
    if (validationError) {
      toast('error', validationError)
      return
    }
    setIsUploadingAvatar(true)
    try {
      const uploaded = await uploadImage(file)
      setAvatarUrl(uploaded.url ?? null)
    } catch (requestError) {
      toast('error', requestError instanceof Error ? requestError.message : '头像上传失败')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    const trimmedNickname = nickname.trim()
    if (trimmedNickname.length < 2 || trimmedNickname.length > NICKNAME_MAX) {
      setNicknameError(`昵称需为 2-${NICKNAME_MAX} 个字符`)
      return
    }
    setNicknameError(null)
    setIsSaving(true)
    try {
      await updateProfile({
        nickname: trimmedNickname,
        bio: bio.trim(),
        avatarUrl: avatarUrl ?? undefined,
      })
      toast('success', '资料已更新')
      navigate('/profile', { replace: true })
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === NICKNAME_EXISTS_CODE) {
        setNicknameError('昵称已被使用，请换一个')
      } else {
        toast('error', requestError instanceof Error ? requestError.message : '保存失败')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const navBar = (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <div className="flex items-center gap-1 -ml-3">
          <Button aria-label="返回上一页" variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button aria-label="返回首页" variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/')}>
            <Home className="h-5 w-5" />
          </Button>
        </div>
        <h1 className="flex-1 truncate text-lg font-bold text-foreground">编辑资料</h1>
        <Button
          disabled={isSaving || isLoading || isUploadingAvatar}
          onClick={() => void handleSave()}
          className="bg-coral text-white hover:bg-coral-dark"
        >
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>
    </nav>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {navBar}
        <main className="mx-auto max-w-5xl space-y-6 p-4 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </main>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-background">
      {navBar}

      <main className="mx-auto max-w-5xl space-y-6 p-4 py-6">
        <section className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-border/60 bg-card p-5">
          {/* ─── 头像 ─── */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              aria-label="更换头像"
              disabled={isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-24 w-24 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="h-24 w-24">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="头像预览" />}
                <AvatarFallback className="bg-coral-light text-3xl font-bold text-coral-contrast">
                  {nickname[0] ?? '?'}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                {isUploadingAvatar
                  ? <Loader2 className="h-6 w-6 animate-spin" />
                  : <Camera className="h-6 w-6" />}
              </span>
              {isUploadingAvatar && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </span>
              )}
            </button>
            <span className="text-xs text-muted-foreground">
              {isUploadingAvatar ? '头像上传中...' : '点击更换头像（JPEG/PNG/WebP，≤10MB）'}
            </span>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
            />
          </div>

          {/* ─── 昵称 ─── */}
          <div>
            <label htmlFor="profile-nickname" className="mb-1.5 block text-sm font-medium">
              昵称 <span className="text-destructive">*</span>
            </label>
            <Input
              id="profile-nickname"
              value={nickname}
              maxLength={NICKNAME_MAX}
              onChange={(event) => { setNickname(event.target.value); setNicknameError(null) }}
              placeholder="2-20 个字符"
              aria-invalid={nicknameError != null}
            />
            <div className="mt-1 flex items-center justify-between">
              {nicknameError
                ? <p role="alert" className="text-xs text-destructive">{nicknameError}</p>
                : <span />}
              <span className="text-xs text-muted-foreground">{nickname.length}/{NICKNAME_MAX}</span>
            </div>
          </div>

          {/* ─── 简介 ─── */}
          <div>
            <label htmlFor="profile-bio" className="mb-1.5 block text-sm font-medium">简介</label>
            <Textarea
              id="profile-bio"
              value={bio}
              maxLength={BIO_MAX}
              onChange={(event) => setBio(event.target.value)}
              className="min-h-24"
              placeholder="介绍一下自己（选填）"
            />
            <div className="mt-1 text-right">
              <span className="text-xs text-muted-foreground">{bio.length}/{BIO_MAX}</span>
            </div>
          </div>

          {/* ─── 用户名（只读） ─── */}
          <div>
            <span className="mb-1.5 block text-sm font-medium">用户名</span>
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">@{profile.username}</p>
            <p className="mt-1 text-xs text-muted-foreground">用户名用于登录，暂不支持修改</p>
          </div>
        </section>

        {/* PC：底部保存（移动端保存按钮在顶部导航栏） */}
        <div className="mt-6 hidden justify-end md:flex">
          <Button
            disabled={isSaving || isLoading || isUploadingAvatar}
            onClick={() => void handleSave()}
            className="min-w-28 bg-coral text-white hover:bg-coral-dark"
          >
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </main>

      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="放弃修改确认"
        >
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6">
            <h3 className="text-lg font-bold text-foreground">放弃未保存的修改？</h3>
            <p className="text-sm text-muted-foreground">返回后本次修改将不会保留。</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLeaveConfirm(false)}>继续编辑</Button>
              <Button
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => { setShowLeaveConfirm(false); smartBack() }}
              >
                放弃修改
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
