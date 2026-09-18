import { useEffect } from 'react'
import { useUiStore } from '@/stores/ui-store'

/**
 * 主题偏好：状态与持久化由 ui-store 单一管理（多入口共享同一事实源），
 * 本 hook 仅负责订阅状态 + 将主题应用到 DOM（documentElement 的 dark class 与系统主题监听）。
 */
export function useTheme() {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = (t: typeof theme) => {
      if (t === 'dark') {
        root.classList.add('dark')
      } else if (t === 'light') {
        root.classList.remove('dark')
      } else {
        // system
        if (mediaQuery.matches) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    }

    applyTheme(theme)

    const handleSystemChange = () => {
      if (useUiStore.getState().theme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleSystemChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange)
    }
  }, [theme])

  return { theme, setTheme, toggleTheme }
}
