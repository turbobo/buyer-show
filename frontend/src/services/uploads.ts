import { request, upload } from './http'

export interface UploadImageResponse {
  url?: string
  objectName: string
  contentType: string
  size: number
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateImageFile(file: File): string | null {
  if (!SUPPORTED_TYPES.has(file.type)) return '仅支持 JPEG、PNG 或 WebP 图片'
  if (file.size === 0) return '请选择非空图片文件'
  if (file.size > MAX_IMAGE_SIZE) return '图片不能超过 10MB'
  return null
}

export function uploadImage(file: File): Promise<UploadImageResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return upload<UploadImageResponse>('/upload/image', formData)
}

export function deleteUploadedImage(objectName: string): Promise<void> {
  return request<void>(`/upload/image?objectName=${encodeURIComponent(objectName)}`, { method: 'DELETE' })
}
