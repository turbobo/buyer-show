import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../error-boundary'

// Suppress console.error during tests
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})

afterEach(() => {
  console.error = originalError
})

// Component that throws an error
function ThrowError({ message = 'Test error' }: { message?: string }) {
  throw new Error(message)
}

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('should catch errors and display fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="Something went wrong" />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('页面出错了')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /回到首页/i })).toBeInTheDocument()
  })

  it('should display default error message when error has no message', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="" />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('渲染过程中发生了未知错误')).toBeInTheDocument()
  })

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error UI</div>
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Custom error UI')).toBeInTheDocument()
    expect(screen.queryByText('页面出错了')).not.toBeInTheDocument()
  })

  it('should reset error state when retry button is clicked', () => {
    let shouldThrow = true
    
    function ConditionalThrow() {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>Recovered content</div>
    }
    
    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>
    )
    
    // Error state
    expect(screen.getByText('页面出错了')).toBeInTheDocument()
    
    // Set up for successful render after reset
    shouldThrow = false
    
    // Click retry button
    const retryButton = screen.getByRole('button', { name: /重试/i })
    fireEvent.click(retryButton)
    
    // Should now show the child content
    expect(screen.getByText('Recovered content')).toBeInTheDocument()
    expect(screen.queryByText('页面出错了')).not.toBeInTheDocument()
  })

  it('should navigate to home when home button is clicked', () => {
    // Mock window.location.href
    const originalLocation = window.location
    delete (window as any).location
    ;(window as any).location = { href: '' }
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    const homeButton = screen.getByRole('button', { name: /回到首页/i })
    fireEvent.click(homeButton)
    
    expect(window.location.href).toBe('/')
    
    // Restore window.location
    window.location = originalLocation
  })

  it('should log error to console when error is caught', () => {
    const consoleSpy = vi.spyOn(console, 'error')
    
    render(
      <ErrorBoundary>
        <ThrowError message="Logged error" />
      </ErrorBoundary>
    )
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ErrorBoundary] 捕获到渲染错误:',
      expect.any(Error),
      expect.any(Object)
    )
  })
})
