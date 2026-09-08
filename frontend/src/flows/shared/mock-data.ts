import type { User, Post, Comment, Conversation, Message, Notification, Tag } from './types'

const IMG = {
  skincare: 'linear-gradient(135deg,#fecdd3,#fda4af)',
  tech: 'linear-gradient(135deg,#c7d2fe,#a5b4fc)',
  shoes: 'linear-gradient(135deg,#fef3c7,#fde68a)',
  food: 'linear-gradient(135deg,#bbf7d0,#86efac)',
  fashion: 'linear-gradient(135deg,#fce7f3,#fbcfe8)',
  audio: 'linear-gradient(135deg,#e9d5ff,#c4b5fd)',
}

export const mockCurrentUser: User = {
  id: 'u1', username: 'xiaolu', nickname: '小鹿斑比', avatarUrl: '',
  bio: '🛍️ 分享真实购物体验 · 护肤控 · 数码爱好者',
  postCount: 128, followerCount: 2300, followingCount: 186,
  role: 'user', status: 'active',
}

const mockUsers: User[] = [
  mockCurrentUser,
  { id: 'u2', username: 'mia', nickname: '美妆小达人', avatarUrl: '', bio: '专注平价好物分享', postCount: 89, followerCount: 5600, followingCount: 230, role: 'user', status: 'active', isFollowing: true },
  { id: 'u3', username: 'kevin', nickname: 'Kevin', avatarUrl: '', bio: '数码产品评测', postCount: 45, followerCount: 1200, followingCount: 89, role: 'user', status: 'active', isFollowing: false },
  { id: 'u4', username: 'runner', nickname: '跑步达人', avatarUrl: '', bio: '跑步使我快乐', postCount: 67, followerCount: 3400, followingCount: 156, role: 'user', status: 'active', isFollowing: true },
  { id: 'u5', username: 'amy', nickname: 'Amy', avatarUrl: '', bio: '生活记录者', postCount: 34, followerCount: 890, followingCount: 67, role: 'user', status: 'active', isFollowing: false },
  { id: 'u6', username: 'saver', nickname: '省钱小能手', avatarUrl: '', bio: '百亿补贴挖掘机', postCount: 156, followerCount: 8900, followingCount: 45, role: 'user', status: 'active', isFollowing: true },
]

export const mockPosts: Post[] = [
  { id: 'p1', userId: 'u2', user: mockUsers[1], title: '兰蔻菁纯面霜，干皮救星！用了一个月真的绝了', content: '兰蔻菁纯面霜真的是我今年买过最满意的护肤品了！我是混干皮，冬天脸颊会起皮，这款面霜的质地很滋润但不油腻...', images: [IMG.skincare], tags: ['护肤', '面霜', '兰蔻', '干皮救星'], productName: '兰蔻菁纯面霜 60ml', productPrice: 890, productSource: '天猫旗舰店', productRating: 4, likeCount: 328, commentCount: 56, favoriteCount: 189, isLiked: true, isFavorited: false, status: 'active', createdAt: '3小时前' },
  { id: 'p2', userId: 'u3', user: mockUsers[2], title: 'iPad mini 7 一个月使用感受', content: '作为一个数码爱好者，iPad mini 7 是今年最让我惊喜的产品...', images: [IMG.tech], tags: ['数码', 'iPad', 'Apple'], productName: 'iPad mini 7', productPrice: 3999, productSource: '京东自营', productRating: 5, likeCount: 156, commentCount: 23, favoriteCount: 67, isLiked: false, isFavorited: true, status: 'active', createdAt: '5小时前' },
  { id: 'p3', userId: 'u4', user: mockUsers[3], title: 'Nike Pegasus 41 跑步鞋开箱', content: '这双鞋的脚感真的太舒服了，适合日常慢跑5-10公里...', images: [IMG.shoes], tags: ['运动', '跑步鞋', 'Nike'], productName: 'Nike Pegasus 41', productPrice: 799, productSource: '得物', productRating: 5, likeCount: 512, commentCount: 89, favoriteCount: 234, isLiked: true, isFavorited: true, status: 'active', createdAt: '8小时前' },
  { id: 'p4', userId: 'u6', user: mockUsers[5], title: '山姆的牛油果真的绝！又回购了', content: '每次去山姆必买的牛油果，品质稳定，价格实惠...', images: [IMG.food], tags: ['食品', '山姆', '水果'], productName: '进口牛油果 6个装', productPrice: 59.9, productSource: '山姆会员店', productRating: 4, likeCount: 89, commentCount: 12, favoriteCount: 34, isLiked: false, isFavorited: false, status: 'active', createdAt: '昨天' },
  { id: 'p5', userId: 'u5', user: mockUsers[4], title: 'AirPods Pro 3 降噪体验，通勤必备', content: '降噪效果比上一代提升明显，通透模式也更自然了...', images: [IMG.audio], tags: ['数码', '耳机', 'Apple'], productName: 'AirPods Pro 3', productPrice: 1899, productSource: 'Apple Store', productRating: 5, likeCount: 267, commentCount: 45, favoriteCount: 123, isLiked: false, isFavorited: false, status: 'active', createdAt: '昨天' },
  { id: 'p6', userId: 'u2', user: mockUsers[1], title: 'MAC 子弹头口红试色合集', content: '收集了 8 支 MAC 经典色号，黄皮白皮都有推荐...', images: [IMG.fashion], tags: ['美妆', '口红', 'MAC'], productName: 'MAC 子弹头口红', productPrice: 189, productSource: '免税店', productRating: 4, likeCount: 445, commentCount: 78, favoriteCount: 312, isLiked: true, isFavorited: true, status: 'active', createdAt: '2天前' },
]

export const mockComments: Comment[] = [
  { id: 'c1', postId: 'p1', userId: 'u2', user: mockUsers[1], parentId: null, content: '这个真的好用！我也是混干皮，种草了！请问是在哪个天猫店买的呀？', replyCount: 1, likeCount: 12, isLiked: false, createdAt: '2小时前', replies: [
    { id: 'c1r1', postId: 'p1', userId: 'u1', user: mockCurrentUser, parentId: 'c1', content: '兰蔻官方旗舰店～可以蹲618活动价更划算！', replyCount: 0, likeCount: 3, isLiked: false, createdAt: '1小时前' },
  ]},
  { id: 'c2', postId: 'p1', userId: 'u3', user: mockUsers[2], parentId: null, content: '价格确实不便宜，但是效果确实好，值这个价 👍', replyCount: 0, likeCount: 5, isLiked: true, createdAt: '1小时前' },
  { id: 'c3', postId: 'p1', userId: 'u6', user: mockUsers[5], parentId: null, content: '拼多多百亿补贴 680 就能入手！比天猫便宜两百多', replyCount: 0, likeCount: 23, isLiked: false, createdAt: '45分钟前' },
  { id: 'c4', postId: 'p1', userId: 'u5', user: mockUsers[4], parentId: null, content: '油皮可以用吗？会不会太滋润了 😂', replyCount: 0, likeCount: 2, isLiked: false, createdAt: '30分钟前' },
]

export const mockConversations: Conversation[] = [
  { id: 'conv1', user: mockUsers[1], lastMessage: '好的～谢谢推荐！我也去买一个试试', lastMessageAt: '10分钟前', unreadCount: 2, isOnline: true },
  { id: 'conv2', user: mockUsers[2], lastMessage: '那个耳机你在哪买的？能发个链接吗', lastMessageAt: '1小时前', unreadCount: 1, isOnline: false },
  { id: 'conv3', user: mockUsers[3], lastMessage: '你的Nike跑鞋是在得物买的吗？', lastMessageAt: '3小时前', unreadCount: 0, isOnline: true },
  { id: 'conv4', user: mockUsers[4], lastMessage: '哈哈哈那个面霜真的超好用！', lastMessageAt: '昨天', unreadCount: 0, isOnline: false },
  { id: 'conv5', user: mockUsers[5], lastMessage: '拼多多百亿补贴渠道分享给你了～', lastMessageAt: '昨天', unreadCount: 0, isOnline: false },
]

export const mockMessages: Message[] = [
  { id: 'm1', senderId: 'u2', content: '你好呀！看了你分享的兰蔻面霜，超种草的！✨', type: 'text', createdAt: '14:20', isRead: true },
  { id: 'm2', senderId: 'u1', content: '哈哈谢谢！真的超好用，强烈推荐！', type: 'text', createdAt: '14:21', isRead: true },
  { id: 'm3', senderId: 'u2', content: '是在天猫旗舰店买的吗？有没有什么优惠呀？', type: 'text', createdAt: '14:22', isRead: true },
  { id: 'm4', senderId: 'u1', content: '对的天猫旗舰店～现在好像有满减活动', type: 'text', createdAt: '14:23', isRead: true },
  { id: 'm5', senderId: 'u1', content: '', type: 'product', productData: { name: '兰蔻菁纯面霜', price: 890, source: '天猫旗舰店', imageUrl: '' }, createdAt: '14:24', isRead: true },
  { id: 'm6', senderId: 'u2', content: '好的～谢谢推荐！我也去买一个试试 😊', type: 'text', createdAt: '14:25', isRead: true },
]

export const mockNotifications: Notification[] = [
  { id: 'n1', type: 'like', actor: mockUsers[1], targetPost: mockPosts[0], content: '赞了你的分享「兰蔻菁纯面霜」', createdAt: '5分钟前', isRead: false },
  { id: 'n2', type: 'comment', actor: mockUsers[2], targetPost: mockPosts[0], content: '评论了你的分享：「价格确实不便宜，但效果确实好」', createdAt: '30分钟前', isRead: false },
  { id: 'n3', type: 'follow', actor: mockUsers[5], content: '关注了你', createdAt: '1小时前', isRead: true },
  { id: 'n4', type: 'like', actor: mockUsers[3], targetPost: mockPosts[2], content: '收藏了你的分享「Nike Pegasus 41」', createdAt: '2小时前', isRead: true },
  { id: 'n5', type: 'system', actor: mockUsers[0], content: '你的分享「兰蔻菁纯面霜」被选为精选推荐 🎉', createdAt: '3小时前', isRead: true },
]

export const mockTags: Tag[] = [
  { name: '全部', postCount: 12800, isFavorited: false },
  { name: '💄 美妆', postCount: 3400, isFavorited: true },
  { name: '📱 数码', postCount: 2800, isFavorited: false },
  { name: '👗 服饰', postCount: 2100, isFavorited: false },
  { name: '🍕 食品', postCount: 1900, isFavorited: true },
  { name: '🏠 家居', postCount: 1500, isFavorited: false },
  { name: '👶 母婴', postCount: 900, isFavorited: false },
  { name: '🏃 运动', postCount: 1200, isFavorited: false },
]

export const hotSearchTags = ['兰蔻菁纯', 'AirPods Pro', 'Switch 2', '优衣库联名', '戴森吹风机', '始祖鸟', '瑞幸咖啡', 'Costco好物']
export const searchHistory = ['口红', 'iPad mini', '跑步鞋', '防晒霜']
