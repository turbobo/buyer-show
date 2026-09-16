import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowLeft, Check, Home, ImagePlus, Star, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { smartBack } from '@/lib/smart-back'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { createPost, getPost, updatePost } from '@/services/posts'
import { deleteUploadedImage, uploadImage, validateImageFile } from '@/services/uploads'
import { useToast } from '@/components/ui/toast'
import { mockTags } from '../shared/mock-data'

const SOURCES = ['天猫', '京东', '拼多多', '线下门店', '海淘', '其他']
const MAX_IMAGES = 9

interface ImageItem {
  /** 唯一标识：新上传用本地预览地址，已有图用其 URL */
  key: string
  /** 展示地址（objectURL 或完整 URL） */
  preview: string
  /** 新选择的本地文件（编辑模式加载的已有图没有该字段） */
  file?: File
  /** 已有图片的存储 URL（编辑模式） */
  url?: string
}

/**
 * 发布 / 编辑分享页。
 * 路由 `/publish` 为发布模式；`/posts/:postId/edit` 为编辑模式（回填原帖内容）。
 */
export default function PublishScreen() {
  const navigate = useNavigate()
  const { postId } = useParams<{ postId: string }>()
  const { toast } = useToast()
  const isEdit = Boolean(postId)
  const [images, setImages] = useState<ImageItem[]>([])
  const [productName, setProductName] = useState('')
  const [source, setSource] = useState(SOURCES[0])
  const [price, setPrice] = useState('')
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [isInitializing, setIsInitializing] = useState(isEdit)
  const [publishStage, setPublishStage] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigateTimerRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 用 ref 追踪所有预览 URL，仅在组件卸载时清理
  const previewUrlsRef = useRef<string[]>([])
  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  // 清理导航定时器
  useEffect(() => () => {
    if (navigateTimerRef.current !== null) {
      window.clearTimeout(navigateTimerRef.current)
    }
  }, [])

  // 编辑模式：加载原帖并回填
  useEffect(() => {
    if (!postId) return
    let cancelled = false
    void (async () => {
      try {
        const post = await getPost(postId)
        if (cancelled) return
        if (post.moderationStatus === 2) {
          toast('error', '帖子已被下架，无法编辑，可在个人主页发起申诉')
          navigate(`/posts/${postId}`, { replace: true })
          return
        }
        setTitle(post.title)
        setContent(post.content)
        setSelectedTags(post.tags ?? [])
        setProductName(post.productName ?? '')
        setPrice(post.productPrice != null ? String(post.productPrice) : '')
        setSource(post.productSource ?? SOURCES[0])
        setRating(post.productRating ?? 5)
        setImages((post.images ?? []).map((url) => ({ key: url, preview: url, url })))
      } catch (requestError) {
        if (!cancelled) {
          toast('error', requestError instanceof Error ? requestError.message : '加载帖子失败')
          navigate('/')
        }
      } finally {
        if (!cancelled) setIsInitializing(false)
      }
    })()
    return () => { cancelled = true }
  }, [postId, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) {
      setError(`最多只能上传 ${MAX_IMAGES} 张图片`)
      event.target.value = ''
      return
    }

    const toAdd = files.slice(0, remaining)
    const newItems: ImageItem[] = []

    for (const file of toAdd) {
      const validationError = validateImageFile(file)
      if (validationError) {
        setError(validationError)
        event.target.value = ''
        return
      }
      const preview = URL.createObjectURL(file)
      previewUrlsRef.current.push(preview)
      newItems.push({ key: preview, preview, file })
    }

    setError(null)
    setImages((prev) => [...prev, ...newItems])
    event.target.value = ''
  }

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => {
      const item = prev[index]
      if (item?.file) {
        URL.revokeObjectURL(item.preview)
        previewUrlsRef.current = previewUrlsRef.current.filter((url) => url !== item.preview)
      }
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleSubmit = async () => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    if (images.length === 0 || !trimmedTitle || !trimmedContent) {
      setError('请填写标题、正文并选择图片')
      return
    }
    if (trimmedContent.length < 10) {
      setError('正文至少填写 10 个字符')
      return
    }
    if (price && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
      setError('请输入有效的商品价格')
      return
    }

    setIsPublishing(true)
    setError(null)
    const filesToUpload = images.filter((item) => item.file)
    setPublishStage(`正在上传图片（0/${filesToUpload.length}）...`)

    const uploadedObjectNames: string[] = []
    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        setPublishStage(`正在上传图片（${i + 1}/${filesToUpload.length}）...`)
        const uploaded = await uploadImage(filesToUpload[i].file as File)
        uploadedObjectNames.push(uploaded.objectName)
      }

      // 保序组装：已有图沿用原 URL，新图使用 pending objectName
      let uploadIndex = 0
      const payloadImages = images.map((item) => {
        if (item.file) {
          return uploadedObjectNames[uploadIndex++]
        }
        return item.url ?? item.preview
      })

      setPublishStage(isEdit ? '正在保存修改...' : '图片上传完成，正在发布内容...')
      const payload = {
        title: trimmedTitle,
        content: trimmedContent,
        images: payloadImages,
        tags: selectedTags,
        productName: productName.trim() || undefined,
        productPrice: price ? Number(price) : undefined,
        productSource: source,
        productRating: rating,
      }
      const post = isEdit && postId ? await updatePost(postId, payload) : await createPost(payload)

      if (isEdit) {
        setResult('保存成功，即将返回详情页')
        navigateTimerRef.current = window.setTimeout(() => navigate(`/posts/${postId}`), 1200)
      } else {
        setResult(post.moderationStatus === 1 ? '内容已提交，正在等待人工审核' : '发布成功，即将跳转详情页')
        navigateTimerRef.current = window.setTimeout(
          () => navigate(post.moderationStatus === 1 ? '/' : `/posts/${post.id}`),
          1200,
        )
      }
    } catch (requestError) {
      // 回滚本次新上传的图片
      for (const name of uploadedObjectNames) {
        await deleteUploadedImage(name).catch(() => undefined)
      }
      setError(requestError instanceof Error ? requestError.message : isEdit ? '保存失败' : '发布失败')
    } finally {
      setIsPublishing(false)
      setPublishStage(null)
    }
  }

  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold">{result}</h1>
        </div>
      </div>
    )
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl md:top-14">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
            <div className="flex items-center gap-1 -ml-3">
              <Button aria-label="返回上一页" variant="ghost" size="icon" onClick={() => smartBack()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button aria-label="返回首页" variant="ghost" size="icon" onClick={() => navigate('/')}>
                <Home className="h-5 w-5" />
              </Button>
            </div>
            <h1 className="flex-1 truncate text-lg font-bold text-foreground">编辑分享</h1>
          </div>
        </nav>
        <main className="mx-auto max-w-3xl space-y-6 p-4 py-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-2xl" />
          ))}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ─── 顶部导航 ─── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl md:top-14">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <div className="flex items-center gap-1 -ml-3">
            <Button aria-label="返回上一页" variant="ghost" size="icon" onClick={() => smartBack()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button aria-label="返回首页" variant="ghost" size="icon" onClick={() => navigate('/')}>
              <Home className="h-5 w-5" />
            </Button>
          </div>
          <h1 className="flex-1 truncate text-lg font-bold text-foreground">{isEdit ? '编辑分享' : '发布分享'}</h1>
          <Button
            disabled={isPublishing}
            onClick={() => void handleSubmit()}
            className="bg-coral text-white hover:bg-coral-dark"
          >
            {isPublishing ? (isEdit ? '保存中...' : '发布中...') : (isEdit ? '保存' : '发布')}
          </Button>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl space-y-6 p-4 py-6">
        {/* ─── 分享内容 ─── */}
        <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="text-lg font-bold">分享内容</h2>

          <div>
            <label htmlFor="post-title" className="mb-1.5 block text-sm font-medium">标题</label>
            <Input
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="用一句话概括你的购物体验"
            />
          </div>

          <div>
            <label htmlFor="post-content" className="mb-1.5 block text-sm font-medium">正文</label>
            <Textarea
              value={content}
              maxLength={5000}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-48"
              placeholder="写下真实使用体验、优缺点和购买建议..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              商品图片
              <span className="ml-2 font-normal text-muted-foreground">
                {images.length}/{MAX_IMAGES}
              </span>
            </label>

            {/* 图片预览网格 */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img, index) => (
                <div key={img.key} className="group relative aspect-square overflow-hidden rounded-xl border border-border/60">
                  <img
                    src={img.preview}
                    alt={`图片 ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                    aria-label={`删除第 ${index + 1} 张图片`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      封面
                    </span>
                  )}
                </div>
              ))}

              {images.length < MAX_IMAGES && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-coral hover:text-coral">
                  <ImagePlus className="mb-1 h-6 w-6" />
                  <span className="text-xs">添加图片</span>
                  <input
                    ref={fileInputRef}
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              支持 JPEG、PNG、WebP，单张最大 10MB，最多 {MAX_IMAGES} 张
            </p>
          </div>
        </section>

        {/* ─── 商品信息 ─── */}
        <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="text-lg font-bold">商品信息</h2>
          <Input
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            placeholder="商品名称（可选）"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              value={price}
              type="number"
              min="0"
              onChange={(event) => setPrice(event.target.value)}
              placeholder="价格（元）"
            />
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button type="button" key={value} onClick={() => setRating(value)}>
                  <Star className={`h-6 w-6 ${value <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setSource(item)}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  source === item ? 'bg-coral text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {/* ─── 标签 ─── */}
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="mb-3 text-lg font-bold">标签</h2>
          <div className="flex flex-wrap gap-2">
            {mockTags.filter((tag) => tag.name !== '全部').map((tag) => {
              const name = tag.name.replace(/^[^\u4e00-\u9fa5]+/, '')
              const selected = selectedTags.includes(name)
              return (
                <button
                  type="button"
                  key={tag.name}
                  onClick={() => setSelectedTags((current) =>
                    selected ? current.filter((item) => item !== name) : current.length < 5 ? [...current, name] : current,
                  )}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                    selected ? 'bg-coral text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {tag.name}
                </button>
              )
            })}
          </div>
        </section>

        {/* ─── 状态提示 ─── */}
        {publishStage && (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{publishStage}</p>
        )}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
            {images.length > 0 && (
              <Button size="sm" variant="outline" disabled={isPublishing} onClick={() => void handleSubmit()}>
                重试
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
