import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('should handle click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should apply variant classes', () => {
    const { rerender } = render(<Button variant="default">Default</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')
    
    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-border')
    
    rerender(<Button variant="destructive">Destructive</Button>)
    expect(screen.getByRole('button')).toHaveClass('text-destructive')
  })

  it('should apply size classes', () => {
    const { rerender } = render(<Button size="default">Default</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-8')
    
    rerender(<Button size="sm">Small</Button>)
    expect(button).toHaveClass('h-7')
    
    rerender(<Button size="lg">Large</Button>)
    expect(button).toHaveClass('h-9')
  })

  it('should render as child element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    
    const link = screen.getByRole('link', { name: /link button/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })
})
