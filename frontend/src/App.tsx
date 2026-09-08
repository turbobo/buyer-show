import { useState } from 'react'
import HomeFeedScreen from './flows/home-feed/feed'
import PostDetailScreen from './flows/post-detail/detail'
import PublishScreen from './flows/publish-post/publish'
import MessagesScreen from './flows/messages/messages'

type Screen = 'feed' | 'detail' | 'publish' | 'messages'

function App() {
  const [screen, setScreen] = useState<Screen>('feed')
  const [selectedPostId, setSelectedPostId] = useState('p1')

  const handlePostClick = (postId: string) => {
    setSelectedPostId(postId)
    setScreen('detail')
  }

  switch (screen) {
    case 'feed':
      return (
        <HomeFeedScreen
          onPostClick={handlePostClick}
          onPublishClick={() => setScreen('publish')}
          onMessagesClick={() => setScreen('messages')}
        />
      )
    case 'detail':
      return <PostDetailScreen postId={selectedPostId} onBack={() => setScreen('feed')} />
    case 'publish':
      return <PublishScreen onBack={() => setScreen('feed')} onPublish={() => setScreen('feed')} />
    case 'messages':
      return <MessagesScreen onBack={() => setScreen('feed')} />
  }
}

export default App
