import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到渲染错误:', error, errorInfo)
    // TODO: 接入错误上报服务（Sentry / Grafana）
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center bg-warm-bg p-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="mb-2 text-lg font-bold text-foreground">页面出错了</h2>
          <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
            {this.state.error?.message || '渲染过程中发生了未知错误'}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={this.handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              重试
            </Button>
            <Button onClick={this.handleGoHome} className="bg-coral text-white hover:bg-coral-dark">
              <Home className="mr-2 h-4 w-4" />
              回到首页
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
