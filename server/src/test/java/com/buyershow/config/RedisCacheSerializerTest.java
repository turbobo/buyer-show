package com.buyershow.config;

import com.buyershow.dto.response.CursorPage;
import com.buyershow.dto.response.PostDTO;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Redis 缓存序列化往返回归测试：
 * 缓存值经 GenericJackson2JsonRedisSerializer 序列化后必须能被完整反序列化，
 * 否则 Spring Cache 命中时会在运行期抛 InvalidDefinitionException（@Builder 无默认构造器即典型根因）。
 */
class RedisCacheSerializerTest {

    private final GenericJackson2JsonRedisSerializer serializer =
            new GenericJackson2JsonRedisSerializer(RedisConfig.createCacheObjectMapper());

    @Test
    void testCursorPagePostDtoRoundTrip() throws Exception {
        PostDTO post = PostDTO.builder()
                .id(1001L)
                .userId(10L)
                .title("缓存序列化回归测试帖")
                .content("正文")
                .images(List.of("http://img/a.png"))
                .tags(List.of("数码"))
                .productName("耳机")
                .productPrice(new BigDecimal("199.90"))
                .productRating(5)
                .likeCount(3)
                .commentCount(1)
                .favoriteCount(0)
                .moderationStatus(1)
                .isLiked(Boolean.FALSE)
                .isFavorited(Boolean.FALSE)
                .createdAt(LocalDateTime.of(2026, 9, 18, 12, 30, 45))
                .userNickname("测试用户")
                .userAvatarUrl("http://img/avatar.png")
                .build();
        CursorPage<PostDTO> page = CursorPage.<PostDTO>builder()
                .list(List.of(post))
                .nextCursor("MTAwMA")
                .build();

        byte[] bytes = serializer.serialize(page);
        assertNotNull(bytes);

        Object restored = serializer.deserialize(bytes);
        assertNotNull(restored);
        assertEquals(CursorPage.class, restored.getClass());

        @SuppressWarnings("unchecked")
        CursorPage<PostDTO> restoredPage = (CursorPage<PostDTO>) restored;
        assertEquals("MTAwMA", restoredPage.getNextCursor());
        assertEquals(1, restoredPage.getList().size());

        PostDTO restoredPost = restoredPage.getList().get(0);
        assertEquals(1001L, restoredPost.getId());
        assertEquals("缓存序列化回归测试帖", restoredPost.getTitle());
        assertEquals(new BigDecimal("199.90"), restoredPost.getProductPrice());
        assertEquals(LocalDateTime.of(2026, 9, 18, 12, 30, 45), restoredPost.getCreatedAt());
        assertEquals(Boolean.FALSE, restoredPost.getIsLiked());
    }

    @Test
    void testEmptyListRoundTrip() throws Exception {
        CursorPage<PostDTO> page = CursorPage.<PostDTO>builder()
                .list(List.of())
                .nextCursor(null)
                .build();

        byte[] bytes = serializer.serialize(page);
        Object restored = serializer.deserialize(bytes);
        assertNotNull(restored);

        @SuppressWarnings("unchecked")
        CursorPage<PostDTO> restoredPage = (CursorPage<PostDTO>) restored;
        assertEquals(0, restoredPage.getList().size());
    }
}
