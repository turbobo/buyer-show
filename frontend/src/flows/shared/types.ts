// Shared types for Buyer Show Web
export type {} // placeholder to satisfy verbatimModuleSyntax

export interface User {
  id: string
  username: string
  nickname: string
  avatarUrl: string
  bio: string
  postCount: number
  followerCount: number
  followingCount: number
  role: 'user' | 'admin'
  status: 'active' | 'banned'
  isFollowing?: boolean
}

export interface Post {
  id: string
  userId: string
  user: User
  title: string
  content: string
  images: string[]
  tags: string[]
  productName?: string
  productPrice?: number
  productSource?: string
  productRating?: number
  likeCount: number
  commentCount: number
  favoriteCount: number
  isLiked: boolean
  isFavorited: boolean
  status: 'active' | 'hidden' | 'deleted'
  createdAt: string
}

export interface Comment {
  id: string
  postId: string
  userId: string
  user: User
  parentId: string | null
  content: string
  replyCount: number
  likeCount: number
  isLiked: boolean
  createdAt: string
  replies?: Comment[]
}

export interface Conversation {
  id: string
  user: User
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  isOnline: boolean
}

export interface Message {
  id: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'product'
  productData?: { name: string; price: number; source: string; imageUrl: string }
  imageUrl?: string
  createdAt: string
  isRead: boolean
}

export interface Notification {
  id: string
  type: 'like' | 'comment' | 'follow' | 'system'
  actor: User
  targetPost?: Post
  content: string
  createdAt: string
  isRead: boolean
}

export interface Tag {
  name: string
  postCount: number
  isFavorited: boolean
}
