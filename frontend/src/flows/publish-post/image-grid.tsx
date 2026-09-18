import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'

/** 单帖最多图片数（上传校验与网格添加入口共用） */
export const MAX_IMAGES = 9

export interface ImageItem {
  /** 唯一标识：新上传用本地预览地址，已有图用其 URL */
  key: string
  /** 展示地址（objectURL 或完整 URL） */
  preview: string
  /** 新选择的本地文件（编辑模式加载的已有图没有该字段） */
  file?: File
  /** 已有图片的存储 URL（编辑模式） */
  url?: string
}

interface ImageGridProps {
  images: ImageItem[]
  onRemove: (index: number) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}

/* ─── 商品图片预览网格（含封面标记 / 删除 / 添加入口） ─── */
export function ImageGrid({ images, onRemove, onFileChange }: ImageGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  return (
    <>
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
              onClick={() => onRemove(index)}
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
              onChange={onFileChange}
            />
          </label>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        支持 JPEG、PNG、WebP，单张最大 10MB，最多 {MAX_IMAGES} 张
      </p>
    </>
  )
}
