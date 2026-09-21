// 运营管理（G10）：Banner 运营位 / 精选流 / 话题管理 三块
import { useState } from 'react'
import { Image, Star, Tags } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BannerPanel from './operations/banner-panel'
import FeaturedPanel from './operations/featured-panel'
import TopicPanel from './operations/topic-panel'

type TabKey = 'banners' | 'featured' | 'topics'

export default function AdminOperationsScreen() {
  const [tab, setTab] = useState<TabKey>('banners')

  return (
    <div className="mx-auto max-w-5xl">
      <Tabs value={tab} onValueChange={(value) => { if (value) setTab(value as TabKey) }}>
        <TabsList className="mb-4">
          <TabsTrigger value="banners">
            <Image className="mr-1.5 h-4 w-4" />Banner 运营位
          </TabsTrigger>
          <TabsTrigger value="featured">
            <Star className="mr-1.5 h-4 w-4" />精选管理
          </TabsTrigger>
          <TabsTrigger value="topics">
            <Tags className="mr-1.5 h-4 w-4" />话题管理
          </TabsTrigger>
        </TabsList>
        <TabsContent value="banners"><BannerPanel /></TabsContent>
        <TabsContent value="featured"><FeaturedPanel /></TabsContent>
        <TabsContent value="topics"><TopicPanel /></TabsContent>
      </Tabs>
    </div>
  )
}
