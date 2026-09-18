import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateImageFile, uploadImage, deleteUploadedImage } from '../uploads'
import * as http from '../http'

// Mock the http module
vi.mock('../http', () => ({
  request: vi.fn(),
  upload: vi.fn(),
}))

const MAX_IMAGE_SIZE = 10 * 1024 * 1024

function makeFile(type: string, size: number): File {
  return new File([new Uint8Array(size)], 'test.png', { type })
}

describe('uploads service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateImageFile', () => {
    it('should reject unsupported type', () => {
      expect(validateImageFile(makeFile('image/gif', 1024))).toBe('仅支持 JPEG、PNG 或 WebP 图片')
    })

    it('should reject empty file', () => {
      expect(validateImageFile(makeFile('image/jpeg', 0))).toBe('请选择非空图片文件')
    })

    it('should reject file over 10MB', () => {
      expect(validateImageFile(makeFile('image/jpeg', MAX_IMAGE_SIZE + 1))).toBe('图片不能超过 10MB')
    })

    it('should accept jpeg / png / webp within limits', () => {
      expect(validateImageFile(makeFile('image/jpeg', MAX_IMAGE_SIZE))).toBeNull()
      expect(validateImageFile(makeFile('image/png', 1024))).toBeNull()
      expect(validateImageFile(makeFile('image/webp', 1))).toBeNull()
    })
  })

  describe('uploadImage', () => {
    it('should upload file as FormData to /upload/image', async () => {
      const file = makeFile('image/png', 1024)
      const mock = { objectName: 'x.png', contentType: 'image/png', size: 1024, url: 'https://cdn/x.png' }
      vi.mocked(http.upload).mockResolvedValueOnce(mock)

      const result = await uploadImage(file)

      expect(http.upload).toHaveBeenCalledTimes(1)
      const [path, formData] = vi.mocked(http.upload).mock.calls[0] as unknown as [string, FormData]
      expect(path).toBe('/upload/image')
      expect(formData.get('file')).toBe(file)
      expect(result).toEqual(mock)
    })
  })

  describe('deleteUploadedImage', () => {
    it('should encode objectName in query', async () => {
      vi.mocked(http.request).mockResolvedValueOnce(undefined)

      await deleteUploadedImage('2026/09/图片 abc.png')

      expect(http.request).toHaveBeenCalledWith(
        '/upload/image?objectName=2026%2F09%2F%E5%9B%BE%E7%89%87%20abc.png',
        { method: 'DELETE' },
      )
    })
  })
})
