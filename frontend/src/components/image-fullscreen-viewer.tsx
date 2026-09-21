import { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface ImageFullscreenViewerProps {
  images: string[]
  initialIndex: number
  onClose: () => void
}

export function ImageFullscreenViewer({ images, initialIndex, onClose }: ImageFullscreenViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const [isCopied, setIsCopied] = useState(false)
  const { toast } = useToast()

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          handlePrev()
          break
        case 'ArrowRight':
          handleNext()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, scale])

  // 锁定 body 滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    setScale(1)
  }, [images.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    setScale(1)
  }, [images.length])

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 3))
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 1))
  }

  const handleCopyLink = async () => {
    const imageUrl = images[currentIndex]
    try {
      await navigator.clipboard.writeText(imageUrl)
      setIsCopied(true)
      toast('success', '图片链接已复制')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      toast('error', '复制失败')
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      onClick={handleBackdropClick}
    >
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white text-sm">
          {currentIndex + 1} / {images.length}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="text-white hover:bg-white/10"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={scale >= 3}
            className="text-white hover:bg-white/10"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyLink}
            className="text-white hover:bg-white/10"
          >
            {isCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* 图片容器 */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <img
          src={images[currentIndex]}
          alt={`图片 ${currentIndex + 1}`}
          draggable={false}
          className={`max-w-full max-h-full object-contain transition-transform duration-200 select-none ${scale > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          style={{ transform: `scale(${scale})` }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation()
            setScale((prev) => (prev > 1 ? 1 : 2))
          }}
        />

        {/* 左右切换按钮 */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}
      </div>

      {/* 底部缩略图导航 */}
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center justify-center gap-2 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index)
                  setScale(1)
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-coral scale-110'
                    : 'border-white/30 hover:border-white/60'
                }`}
              >
                <img
                  src={image}
                  alt={`缩略图 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
