import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ArrowLeft, Check, ImagePlus, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createPost } from '@/services/posts'
import { deleteUploadedImage, uploadImage, validateImageFile } from '@/services/uploads'
import { mockTags } from '../shared/mock-data'

const SOURCES = ['天猫', '京东', '拼多多', '线下门店', '海淘', '其他']

export default function PublishScreen() {
  const navigate = useNavigate()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
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

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview) }, [imagePreview])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const validationError = validateImageFile(file)
    if (validationError) { setError(validationError); event.target.value = ''; return }
    setError(null)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handlePublish = async () => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()
    if (!imageFile || !trimmedTitle || !trimmedContent) { setError('请填写标题、正文并选择图片'); return }
    if (trimmedContent.length < 10) { setError('正文至少填写 10 个字符'); return }
    if (price && (!Number.isFinite(Number(price)) || Number(price) < 0)) { setError('请输入有效的商品价格'); return }

    setIsPublishing(true)
    setError(null)
    setPublishStage('正在上传图片...')
    let uploadedObjectName: string | null = null
    try {
      const uploadResult = await uploadImage(imageFile)
      uploadedObjectName = uploadResult.objectName
      setPublishStage('图片上传完成，正在发布内容...')
      const post = await createPost({
        title: trimmedTitle, content: trimmedContent, images: [uploadResult.objectName], tags: selectedTags,
        productName: productName.trim() || undefined, productPrice: price ? Number(price) : undefined,
        productSource: source, productRating: rating,
      })
      setResult(post.moderationStatus === 1 ? '内容已提交，正在等待人工审核' : '发布成功，即将跳转详情页')
      window.setTimeout(() => navigate(post.moderationStatus === 1 ? '/' : `/posts/${post.id}`), 1200)
    } catch (requestError) {
      if (uploadedObjectName) {
        await deleteUploadedImage(uploadedObjectName).catch(() => undefined)
      }
      setError(requestError instanceof Error ? requestError.message : '发布失败')
    } finally {
      setIsPublishing(false)
      setPublishStage(null)
    }
  }

  if (result) return <div className="flex min-h-screen items-center justify-center bg-warm-bg"><div className="space-y-4 text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100"><Check className="h-8 w-8 text-green-600" /></div><h1 className="text-xl font-bold">{result}</h1></div></div>

  return <div className="min-h-screen bg-warm-bg"><nav className="sticky top-0 z-50 border-b border-border bg-white/95"><div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4"><Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="mr-1 h-4 w-4" />取消</Button><h1 className="font-semibold">发布分享</h1><Button disabled={isPublishing} onClick={() => void handlePublish()} className="bg-coral text-white hover:bg-coral-dark">{isPublishing ? '上传并发布中...' : '发布'}</Button></div></nav><main className="mx-auto max-w-3xl space-y-6 p-4 py-6"><section className="space-y-4 rounded-2xl border border-border/60 bg-white p-5"><h2 className="text-lg font-bold">分享内容</h2><div><label className="mb-1.5 block text-sm font-medium">标题</label><Input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} placeholder="用一句话概括你的购物体验" /></div><div><label className="mb-1.5 block text-sm font-medium">正文</label><Textarea value={content} maxLength={5000} onChange={(event) => setContent(event.target.value)} className="min-h-48" placeholder="写下真实使用体验、优缺点和购买建议..." /></div><div><label className="mb-1.5 block text-sm font-medium">商品图片</label><label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-5 text-sm text-muted-foreground hover:border-coral hover:text-coral"><ImagePlus className="mb-2 h-6 w-6" /><span>{imageFile ? imageFile.name : '选择 JPEG、PNG 或 WebP 图片（最大 10MB）'}</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} /></label>{imagePreview && <img className="mt-3 aspect-video w-full rounded-xl object-cover" src={imagePreview} alt="待发布商品预览" />}</div></section><section className="space-y-4 rounded-2xl border border-border/60 bg-white p-5"><h2 className="text-lg font-bold">商品信息</h2><Input value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="商品名称（可选）" /><div className="grid gap-4 sm:grid-cols-2"><Input value={price} type="number" min="0" onChange={(event) => setPrice(event.target.value)} placeholder="价格（元）" /><div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} onClick={() => setRating(value)}><Star className={`h-6 w-6 ${value <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} /></button>)}</div></div><div className="flex flex-wrap gap-2">{SOURCES.map((item) => <button type="button" key={item} onClick={() => setSource(item)} className={`rounded-lg px-3 py-2 text-sm ${source === item ? 'bg-coral text-white' : 'bg-muted text-muted-foreground'}`}>{item}</button>)}</div></section><section className="rounded-2xl border border-border/60 bg-white p-5"><h2 className="mb-3 text-lg font-bold">标签</h2><div className="flex flex-wrap gap-2">{mockTags.filter((tag) => tag.name !== '全部').map((tag) => { const name = tag.name.replace(/^[^\u4e00-\u9fa5]+/, ''); const selected = selectedTags.includes(name); return <button type="button" key={tag.name} onClick={() => setSelectedTags((current) => selected ? current.filter((item) => item !== name) : current.length < 5 ? [...current, name] : current)} className={`rounded-full px-3 py-1.5 text-sm ${selected ? 'bg-coral text-white' : 'bg-muted text-muted-foreground'}`}>{tag.name}</button> })}</div></section>{publishStage && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{publishStage}</p>}{error && <div className="flex items-center justify-between gap-3 rounded-lg bg-destructive/10 p-3"><p className="text-sm text-destructive">{error}</p>{imageFile && <Button size="sm" variant="outline" disabled={isPublishing} onClick={() => void handlePublish()}>重试</Button>}</div>}</main></div>
}
