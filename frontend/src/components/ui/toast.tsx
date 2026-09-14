import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, Loader2, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'loading'

interface ToastItem {
  id: number
  type: ToastType
  message: string
  duration: number
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // 返回 no-op，避免未包裹 Provider 时报错
    return { toast: () => {} }
  }
  return ctx
}

const iconMap: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  loading: Loader2,
}

const defaultDuration: Record<ToastType, number> = {
  success: 2000,
  error: 3000,
  info: 2000,
  loading: 0,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = nextId.current++
    const ms = duration ?? defaultDuration[type]
    setToasts((prev) => [...prev, { id, type, message, duration: ms }])
    if (ms > 0) {
      setTimeout(() => removeToast(id), ms)
    }
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed left-1/2 top-16 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = iconMap[t.type]
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-gray-800/90 px-4 py-2.5 text-sm text-white shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <Icon className={`h-4 w-4 shrink-0 ${t.type === 'loading' ? 'animate-spin' : ''} ${
                t.type === 'success' ? 'text-green-400' :
                t.type === 'error' ? 'text-red-400' :
                t.type === 'info' ? 'text-blue-400' :
                'text-white'
              }`} />
              <span>{t.message}</span>
              {t.duration > 0 && (
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="ml-1 shrink-0 rounded-full p-0.5 transition-colors hover:bg-white/20"
                  aria-label="关闭"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
