import { lazy, Suspense, useEffect, type ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getAccessToken } from './services/http'
import { ErrorBoundary } from './components/error-boundary'
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
const AdminModerationScreen = lazy(() => import('./flows/admin/moderation'))
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

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-transition">
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location}>
          <Route path="/" element={<HomeFeedScreen />} />
          <Route path="/posts/:postId" element={<PostDetailScreen />} />
          <Route path="/publish" element={<ProtectedRoute><PublishScreen /></ProtectedRoute>} />
          <Route path="/posts/:postId/edit" element={<ProtectedRoute><PublishScreen /></ProtectedRoute>} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/user/:userId" element={<ProfileScreen />} />
          <Route path="/profile" element={<ProtectedRoute><ProfileScreen self /></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute><EditProfileScreen /></ProtectedRoute>} />
          <Route path="/admin/moderation" element={<ProtectedRoute><AdminModerationScreen /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesScreen onBack={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </Suspense>
    </div>
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
