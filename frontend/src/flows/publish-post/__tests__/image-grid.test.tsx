import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageGrid, MAX_IMAGES, type ImageItem } from '../image-grid'

function makeImages(count: number): ImageItem[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `img-${index}`,
    preview: `blob:preview-${index}`,
  }))
}

describe('ImageGrid', () => {
  it('should render images with cover badge only on the first', () => {
    render(<ImageGrid images={makeImages(2)} onRemove={vi.fn()} onFileChange={vi.fn()} />)

    expect(screen.getByAltText('图片 1')).toBeInTheDocument()
    expect(screen.getByAltText('图片 2')).toBeInTheDocument()
    expect(screen.getByText('封面')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除第 1 张图片' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '删除第 2 张图片' })).toBeInTheDocument()
  })

  it('should call onRemove with the correct index', () => {
    const onRemove = vi.fn()
    render(<ImageGrid images={makeImages(3)} onRemove={onRemove} onFileChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '删除第 2 张图片' }))

    expect(onRemove).toHaveBeenCalledWith(1)
  })

  it('should hide the add entry when reaching MAX_IMAGES', () => {
    const { container } = render(
      <ImageGrid images={makeImages(MAX_IMAGES)} onRemove={vi.fn()} onFileChange={vi.fn()} />,
    )

    expect(screen.queryByText('添加图片')).not.toBeInTheDocument()
    expect(container.querySelector('input[type="file"]')).toBeNull()
  })

  it('should show only the add entry when empty', () => {
    render(<ImageGrid images={[]} onRemove={vi.fn()} onFileChange={vi.fn()} />)

    expect(screen.getByText('添加图片')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /删除第/ })).toBeNull()
  })

  it('should forward file input change to onFileChange', () => {
    const onFileChange = vi.fn()
    const { container } = render(
      <ImageGrid images={[]} onRemove={vi.fn()} onFileChange={onFileChange} />,
    )

    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [new File([], 'a.png', { type: 'image/png' })] },
    })

    expect(onFileChange).toHaveBeenCalledTimes(1)
  })

  it('should show size and count hints', () => {
    render(<ImageGrid images={[]} onRemove={vi.fn()} onFileChange={vi.fn()} />)

    expect(screen.getByText(/JPEG、PNG、WebP/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`最多 ${MAX_IMAGES} 张`))).toBeInTheDocument()
  })
})
