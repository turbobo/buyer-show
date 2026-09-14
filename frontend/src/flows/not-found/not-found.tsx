import { Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundScreen() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-warm-bg p-8">
      <p className="mb-2 text-7xl font-bold text-coral/20">404</p>
      <h1 className="mb-2 text-xl font-bold text-foreground">页面不存在</h1>
      <p className="mb-6 text-sm text-muted-foreground">你访问的页面可能已被移除或地址有误</p>
      <Button onClick={() => navigate('/')} className="rounded-full bg-coral text-white hover:bg-coral-dark">
        <Home className="mr-2 h-4 w-4" />
        回到首页
      </Button>
    </div>
  )
}
