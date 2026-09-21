// 运营管理（G10+G11）：Banner 运营位 / 精选流 / 话题管理 / 系统公告 四块
import { useState } from 'react'
import { Image, Megaphone, Star, Tags } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BannerPanel from './operations/banner-panel'
import FeaturedPanel from './operations/featured-panel'
import TopicPanel from './operations/topic-panel'
import AnnouncementPanel from './operations/announcement-panel'

type TabKey = 'banners' | 'featured' | 'topics' | 'announcements'

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
          <TabsTrigger value="announcements">
            <Megaphone className="mr-1.5 h-4 w-4" />系统公告
          </TabsTrigger>
        </TabsList>
        <TabsContent value="banners"><BannerPanel /></TabsContent>
        <TabsContent value="featured"><FeaturedPanel /></TabsContent>
        <TabsContent value="topics"><TopicPanel /></TabsContent>
        <TabsContent value="announcements"><AnnouncementPanel /></TabsContent>
      </Tabs>
    </div>
  )
}
