import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowLeft, Check, ImagePlus, Star, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createPost } from '@/services/posts'
import { deleteUploadedImage, uploadImage, validateImageFile } from '@/services/uploads'
import { useToast } from '@/components/ui/toast'
import { mockTags } from '../shared/mock-data'

const SOURCES = ['天猫', '京东', '拼多多', '线下门店', '海淘', '其他']
const MAX_IMAGES = 9

interface ImageItem {
  file: File
  preview: string
}

export default function PublishScreen() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [images, setImages] = useState<ImageItem[]>([])
  const [productName, setProductName] = useState('')
  const [source, setSource] = useState(SOURCES[0])
  const [price, setPrice] = useState('')
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishStage, setPublishStage] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigateTimerRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 清理所有预览 URL
  useEffect(() => () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview))
  }, [images])

  // 清理导航定时器
  useEffect(() => () => {
    if (navigateTimerRef.current !== null) {
      window.clearTimeout(navigateTimerRef.current)
    }
  }, [])

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
      newItems.push({ file, preview: URL.createObjectURL(file) })
    }

    setError(null)
    setImages((prev) => [...prev, ...newItems])
    event.target.value = ''
  }

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => {
      const item = prev[index]
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handlePublish = async () => {
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
    setPublishStage(`正在上传图片（0/${images.length}）...`)

    const uploadedObjectNames: string[] = []
    try {
      for (let i = 0; i < images.length; i++) {
        setPublishStage(`正在上传图片（${i + 1}/${images.length}）...`)
        const result = await uploadImage(images[i].file)
        uploadedObjectNames.push(result.objectName)
      }

      setPublishStage('图片上传完成，正在发布内容...')
      const post = await createPost({
        title: trimmedTitle,
        content: trimmedContent,
        images: uploadedObjectNames,
        tags: selectedTags,
        productName: productName.trim() || undefined,
        productPrice: price ? Number(price) : undefined,
        productSource: source,
        productRating: rating,
      })
      setResult(post.moderationStatus === 1 ? '内容已提交，正在等待人工审核' : '发布成功，即将跳转详情页')
      navigateTimerRef.current = window.setTimeout(
        () => navigate(post.moderationStatus === 1 ? '/' : `/posts/${post.id}`),
        1200,
      )
    } catch (requestError) {
      // 回滚已上传的图片
      for (const name of uploadedObjectNames) {
        await deleteUploadedImage(name).catch(() => undefined)
      }
      setError(requestError instanceof Error ? requestError.message : '发布失败')
    } finally {
      setIsPublishing(false)
      setPublishStage(null)
    }
  }

  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm-bg">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold">{result}</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* ─── 顶部导航 ─── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-white/95">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" />取消
          </Button>
          <h1 className="font-semibold">发布分享</h1>
          <Button
            disabled={isPublishing}
            onClick={() => void handlePublish()}
            className="bg-coral text-white hover:bg-coral-dark"
          >
            {isPublishing ? '发布中...' : '发布'}
          </Button>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl space-y-6 p-4 py-6">
        {/* ─── 分享内容 ─── */}
        <section className="space-y-4 rounded-2xl border border-border/60 bg-white p-5">
          <h2 className="text-lg font-bold">分享内容</h2>

          <div>
            <label className="mb-1.5 block text-sm font-medium">标题</label>
            <Input
              value={title}
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="用一句话概括你的购物体验"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">正文</label>
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
                <div key={img.preview} className="group relative aspect-square overflow-hidden rounded-xl border border-border/60">
                  <img
                    src={img.preview}
                    alt={`待上传图片 ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
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
        <section className="space-y-4 rounded-2xl border border-border/60 bg-white p-5">
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
        <section className="rounded-2xl border border-border/60 bg-white p-5">
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
              <Button size="sm" variant="outline" disabled={isPublishing} onClick={() => void handlePublish()}>
                重试
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
