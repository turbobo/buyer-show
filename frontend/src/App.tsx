import { lazy, Suspense, useEffect, type ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { getAccessToken, getTokenRole } from './services/http'
import { ErrorBoundary } from './components/error-boundary'
import { AppTabBar } from './components/layout/app-tabbar'
import { DesktopHeader } from './components/layout/desktop-header'
import { smartBack } from './lib/smart-back'
import { Skeleton } from './components/ui/skeleton'

// 路由级懒加载 — 首页 Feed 立即加载，其余按需
const HomeFeedScreen = lazy(() => import('./flows/home-feed/feed'))
const PostDetailScreen = lazy(() => import('./flows/post-detail/detail'))
const PublishScreen = lazy(() => import('./flows/publish-post/publish'))
const MessagesScreen = lazy(() => import('./flows/messages/messages'))
const NotificationsScreen = lazy(() => import('./flows/messages/notifications-screen').then(m => ({ default: m.NotificationsScreen })))
const LoginScreen = lazy(() => import('./flows/auth/login'))
const ProfileScreen = lazy(() => import('./flows/profile/profile'))
const EditProfileScreen = lazy(() => import('./flows/profile/edit-profile'))
const ChangePasswordScreen = lazy(() => import('./flows/profile/change-password'))
const FollowListScreen = lazy(() => import('./flows/profile/follow-list'))
const AdminLayout = lazy(() => import('./components/admin/admin-layout'))
const AdminModerationScreen = lazy(() => import('./flows/admin/moderation'))
const AdminReportsScreen = lazy(() => import('./flows/admin/reports'))
const AdminAppealsScreen = lazy(() => import('./flows/admin/appeals'))
const AdminUsersScreen = lazy(() => import('./flows/admin/users'))
const AdminAnalytics = lazy(() => import('./flows/admin/analytics'))
const NotFoundScreen = lazy(() => import('./flows/not-found/not-found'))

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactElement }) {
  const location = useLocation()
  if (!getAccessToken()) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }
  return children
}

function AdminRoute({ children }: { children: ReactElement }) {
  const location = useLocation()
  if (!getAccessToken()) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (getTokenRole() !== 'ADMIN') {
    return <Navigate to="/" replace />
  }
  return children
}

// 滚动位置恢复：前进（PUSH）回顶；后退（POP，如详情→Feed）恢复离开前位置
const scrollPositions = new Map<string, number>()

function ScrollRestoration() {
  const { pathname, key } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType === 'POP') {
      const saved = scrollPositions.get(key)
      if (saved != null && saved > 1) {
        // 返回的列表数据可能尚未加载完成（高度不足），短轮询重试恢复
        let tries = 0
        const restore = () => {
          window.scrollTo(0, saved)
          if (Math.abs(window.scrollY - saved) > 1 && tries < 20) {
            tries += 1
            window.setTimeout(restore, 60)
          }
        }
        const raf = requestAnimationFrame(restore)
        return () => window.cancelAnimationFrame(raf)
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, key, navigationType])

  useEffect(() => {
    // 滚动过程中实时记录当前位置（离开前最后位置天然已保存）
    const save = () => {
      if (scrollPositions.size > 200) {
        const oldest = scrollPositions.keys().next().value
        if (oldest !== undefined) {
          scrollPositions.delete(oldest)
        }
      }
      scrollPositions.set(key, window.scrollY)
    }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [key])

  return null
}

// PC 键盘导航：Esc 返回上一页（弹窗打开时交由弹窗自行处理）
function EscapeBack() {
  const { pathname } = useLocation()
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || pathname === '/') return
      if (document.querySelector('[role="dialog"], [role="menu"]')) return
      smartBack()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pathname])
  return null
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <>
      {/* 全局层（禁止放入 .page-transition：其 transform 动画会影响内部 fixed/sticky 定位） */}
      <ScrollRestoration />
      <EscapeBack />
      <DesktopHeader />
      <div key={location.pathname} className="page-transition">
        <Suspense fallback={<RouteFallback />}>
          <Routes location={location}>
          <Route path="/" element={<HomeFeedScreen />} />
          <Route path="/posts/:postId" element={<PostDetailScreen />} />
          <Route path="/publish" element={<ProtectedRoute><PublishScreen /></ProtectedRoute>} />
          <Route path="/posts/:postId/edit" element={<ProtectedRoute><PublishScreen /></ProtectedRoute>} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/user/:userId" element={<ProfileScreen />} />
          <Route path="/user/:userId/followers" element={<FollowListScreen mode="followers" />} />
          <Route path="/user/:userId/following" element={<FollowListScreen mode="following" />} />
          <Route path="/profile" element={<ProtectedRoute><ProfileScreen self /></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute><EditProfileScreen /></ProtectedRoute>} />
          <Route path="/profile/change-password" element={<ProtectedRoute><ChangePasswordScreen /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="moderation" element={<AdminModerationScreen />} />
            <Route path="reports" element={<AdminReportsScreen />} />
            <Route path="appeals" element={<AdminAppealsScreen />} />
            <Route path="users" element={<AdminUsersScreen />} />
          </Route>
          <Route path="/messages" element={<ProtectedRoute><MessagesScreen onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
        </Suspense>
      </div>
      <AppTabBar />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AnimatedRoutes />
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
