import type { ApiPost } from '@/services/posts'

interface StructuredDataProps {
  post: ApiPost
}

export function PostStructuredData({ post }: StructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: post.title,
    articleBody: post.content,
    author: {
      '@type': 'Person',
      name: post.userNickname,
      image: post.userAvatarUrl,
    },
    datePublished: post.createdAt,
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post.likeCount,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: post.commentCount,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/ShareAction',
        userInteractionCount: post.favoriteCount,
      },
    ],
    keywords: post.tags.join(', '),
    ...(post.productName && {
      about: {
        '@type': 'Product',
        name: post.productName,
        ...(post.productPrice && {
          offers: {
            '@type': 'Offer',
            price: post.productPrice,
            priceCurrency: 'CNY',
          },
        }),
      },
    }),
    ...(post.images.length > 0 && {
      image: post.images,
    }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
