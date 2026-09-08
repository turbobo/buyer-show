// FLOW: Publish Shopping Share
// SCREEN 1 of 1: Multi-step Publish Form | PLATFORM: Web (responsive) | ENTRY: /publish | EXIT: Home Feed
import { useState } from 'react'
import { ArrowLeft, X, Upload, Star, Tag, Image, Smile, Hash, AtSign, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { mockTags } from '../shared/mock-data'

const SOURCES = ['🛒 天猫', '🏬 京东', '🟠 拼多多', '🏪 线下门店', '🌍 海淘', '📦 其他']
const IMG_GRADIENTS = [
  'linear-gradient(135deg,#fecdd3,#fda4af)',
  'linear-gradient(135deg,#fde68a,#fbbf24)',
  'linear-gradient(135deg,#c7d2fe,#a5b4fc)',
  'linear-gradient(135deg,#bbf7d0,#86efac)',
  'linear-gradient(135deg,#fce7f3,#fbcfe8)',
  'linear-gradient(135deg,#e9d5ff,#c4b5fd)',
]

export default function PublishScreen({ onBack, onPublish }: { onBack: () => void; onPublish: () => void }) {
  const [step, setStep] = useState(1)
  const [images, setImages] = useState<number[]>([0, 1, 2])
  const [productName, setProductName] = useState('')
  const [source, setSource] = useState('🛒 天猫')
  const [price, setPrice] = useState('')
  const [rating, setRating] = useState(4)
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [published, setPublished] = useState(false)

  const handlePublish = () => {
    setPublished(true)
    setTimeout(onPublish, 1500)
  }

  if (published) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">发布成功！</h2>
          <p className="text-muted-foreground">正在跳转首页...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-bg">
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> {step > 1 ? '上一步' : '取消'}
          </Button>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-2 h-2 rounded-full transition-all ${s === step ? 'bg-coral w-6' : s < step ? 'bg-coral/40' : 'bg-muted'}`} />
            ))}
          </div>
          <Button
            onClick={() => step < 3 ? setStep(step + 1) : handlePublish()}
            disabled={step === 1 && images.length === 0}
            className="bg-coral hover:bg-coral-dark text-white rounded-full h-8 px-4 text-sm"
          >
            {step < 3 ? '下一步' : '发布 🎉'}
          </Button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Step 1: Image Upload + Product Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-border/60 p-5 md:p-6">
              <h2 className="text-lg font-bold text-foreground mb-1">上传图片</h2>
              <p className="text-sm text-muted-foreground mb-4">选择 1-9 张商品实拍图</p>
              <div className="grid grid-cols-3 gap-3">
                {images.map((idx, i) => (
                  <div key={i} className="aspect-square rounded-xl relative group overflow-hidden" style={{ background: IMG_GRADIENTS[idx] }}>
                    <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-60">
                      {['🧴', '✨', '💆', '🌿', '💄', '🧖'][idx]}
                    </div>
                    <button
                      onClick={() => setImages(images.filter((_, j) => j !== i))}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {images.length < 9 && (
                  <button
                    onClick={() => setImages([...images, images.length % 6])}
                    className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-coral/50 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-coral transition-colors"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-xs">添加图片</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border/60 p-5 md:p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground mb-1">商品信息</h2>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">商品名称 <span className="text-coral">*</span></label>
                <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="输入商品名称，如「兰蔻菁纯面霜 60ml」" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">购物来源 <span className="text-coral">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {SOURCES.map(s => (
                    <button key={s} onClick={() => setSource(s)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${source === s ? 'bg-coral text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">价格（元）</label>
                  <Input value={price} onChange={e => setPrice(e.target.value)} placeholder="¥ 0.00" type="number" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">评分</label>
                  <div className="flex items-center gap-1 h-10">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} onClick={() => setRating(s)}>
                        <Star className={`w-7 h-7 transition-colors ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Content Editor */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-border/60 p-5 md:p-6">
              <h2 className="text-lg font-bold text-foreground mb-1">分享正文</h2>
              <p className="text-sm text-muted-foreground mb-4">写下你的真实使用体验</p>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="这款商品值不值得买？使用感受如何？有什么优缺点？..."
                className="min-h-[200px] resize-none border-border/60 text-sm leading-relaxed"
              />
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/40">
                <button className="text-muted-foreground hover:text-coral transition-colors"><Image className="w-5 h-5" /></button>
                <button className="text-muted-foreground hover:text-coral transition-colors"><Smile className="w-5 h-5" /></button>
                <button className="text-muted-foreground hover:text-coral transition-colors"><Hash className="w-5 h-5" /></button>
                <button className="text-muted-foreground hover:text-coral transition-colors"><AtSign className="w-5 h-5" /></button>
                <span className="ml-auto text-xs text-muted-foreground">{content.length}/2000</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border/60 p-5 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-coral" />
                <h3 className="text-sm font-semibold text-foreground">添加标签</h3>
                <span className="text-xs text-muted-foreground">（最多 5 个）</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {mockTags.filter(t => t.name !== '全部').map(tag => {
                  const cleanName = tag.name.replace(/^[^\u4e00-\u9fa5]+/, '')
                  const isSelected = selectedTags.includes(cleanName)
                  return (
                    <button key={tag.name} onClick={() => {
                      if (isSelected) setSelectedTags(selectedTags.filter(t => t !== cleanName))
                      else if (selectedTags.length < 5) setSelectedTags([...selectedTags, cleanName])
                    }}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${isSelected ? 'bg-coral text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {isSelected && '✓ '}{tag.name}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Publish */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-border/60 overflow-hidden">
              <div className="p-5 md:p-6 border-b border-border/40">
                <h2 className="text-lg font-bold text-foreground">预览</h2>
                <p className="text-sm text-muted-foreground">检查你的分享是否满意</p>
              </div>

              {/* Preview Card */}
              <div className="p-5 md:p-6">
                <div className="flex gap-3 mb-4">
                  {images.slice(0, 3).map((idx, i) => (
                    <div key={i} className={`rounded-lg overflow-hidden ${i === 0 ? 'flex-[2]' : 'flex-1'}`} style={{ background: IMG_GRADIENTS[idx] }}>
                      <div className="aspect-square flex items-center justify-center text-2xl opacity-60">
                        {['🧴', '✨', '💆', '🌿', '💄', '🧖'][idx]}
                      </div>
                    </div>
                  ))}
                </div>

                <h3 className="text-lg font-bold text-foreground mb-3">{productName || '商品名称'}</h3>

                {productName && (
                  <div className="bg-warm-bg border border-border/60 rounded-xl p-4 flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl" style={{ background: IMG_GRADIENTS[0] }}>🧴</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{productName}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-0 text-xs">{source}</Badge>
                        <div className="flex">{Array.from({ length: rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}</div>
                      </div>
                    </div>
                    {price && <span className="text-lg font-bold text-coral">¥{price}</span>}
                  </div>
                )}

                <p className="text-sm text-foreground/70 leading-relaxed line-clamp-4">{content || '在这里预览你的正文内容...'}</p>

                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedTags.map(tag => <span key={tag} className="text-xs text-coral">#{tag}</span>)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-full">返回编辑</Button>
              <Button onClick={handlePublish} className="flex-1 h-12 rounded-full bg-coral hover:bg-coral-dark text-white text-base font-semibold shadow-lg shadow-coral/20">
                发布分享 🎉
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
