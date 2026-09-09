import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import HomeFeedScreen from './flows/home-feed/feed'
import PostDetailScreen from './flows/post-detail/detail'
import PublishScreen from './flows/publish-post/publish'
import MessagesScreen from './flows/messages/messages'
import LoginScreen from './flows/auth/login'
import AdminModerationScreen from './flows/admin/moderation'
import { getAccessToken } from './services/http'

function ProtectedRoute({ children }: { children: ReactElement }) {
  const location = useLocation()
  if (!getAccessToken()) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeFeedScreen />} />
        <Route path="/posts/:postId" element={<PostDetailScreen />} />
        <Route path="/publish" element={<ProtectedRoute><PublishScreen /></ProtectedRoute>} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/admin/moderation" element={<ProtectedRoute><AdminModerationScreen /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><MessagesScreen onBack={() => window.history.back()} /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
