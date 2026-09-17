package com.buyershow.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 在线状态服务测试。
 *
 * @author Qoder
 * @since 2026/09/17
 */
class ActivityServiceTest {

    @SuppressWarnings("unchecked")
    private final ValueOperations<String, Object> valueOperations = mock(ValueOperations.class);
    private final RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class);
    private final ActivityService service = new ActivityService(redisTemplate);

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void testTouchWritesTtlMarker() {
        service.touch(9L);

        verify(valueOperations).set(eq("activity:user:9"), org.mockito.ArgumentMatchers.any(), eq(Duration.ofSeconds(60)));
    }

    @Test
    void testOnlineAmongFiltersExistingKeys() {
        when(valueOperations.multiGet(List.of("activity:user:1", "activity:user:2", "activity:user:3")))
                .thenReturn(Arrays.asList(1L, null, 3L));

        Set<Long> online = service.onlineAmong(List.of(1L, 2L, 3L));

        assertEquals(Set.of(1L, 3L), online);
    }
}
