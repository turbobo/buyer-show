import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function imageBackground(image?: string): string {
  if (image?.startsWith('http')) {
    const encoded = encodeURI(image).replace(/[()]/g, encodeURIComponent)
    return `url("${encoded}") center / cover`
  }
  return image || 'linear-gradient(135deg,#fecdd3,#fda4af)'
}

/* ─── 图片轮播组件（详情页移动端全宽 / 桌面端左栏共用） ─── */
export function PostImageCarousel({ images, title, onImageClick }: { images: string[]; title: string; onImageClick?: (index: number) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const hasMultiple = images.length > 1

  const scrollTo = (index: number) => {
    const el = scrollRef.current
    if (!el) return
    const target = Math.max(0, Math.min(index, images.length - 1))
    el.scrollTo({ left: el.offsetWidth * target, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const index = Math.round(el.scrollLeft / el.offsetWidth)
    setActiveIndex(Math.max(0, Math.min(index, images.length - 1)))
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') scrollTo(activeIndex - 1)
          if (e.key === 'ArrowRight') scrollTo(activeIndex + 1)
        }}
        tabIndex={0}
        className="flex snap-x snap-mandatory overflow-x-hidden outline-none focus-visible:ring-2 focus-visible:ring-coral"
        role="region"
        aria-label={`${title} 商品图片`}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className="w-full flex-none snap-center bg-muted cursor-zoom-in"
            style={{ aspectRatio: '4 / 3', background: imageBackground(image) }}
            onClick={() => onImageClick?.(index)}
          />
        ))}
      </div>

      {hasMultiple && activeIndex > 0 && (
        <button
          type="button"
          onClick={() => scrollTo(activeIndex - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-md transition-opacity hover:bg-white"
          aria-label="上一张图片"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {hasMultiple && activeIndex < images.length - 1 && (
        <button
          type="button"
          onClick={() => scrollTo(activeIndex + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-md transition-opacity hover:bg-white"
          aria-label="下一张图片"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollTo(index)}
              className={`block h-1.5 rounded-full transition-all ${
                index === activeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`跳转到第 ${index + 1} 张图片`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
