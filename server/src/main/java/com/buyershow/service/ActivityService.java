package com.buyershow.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 在线状态：基于 Redis 活跃标记（认证请求触发，60 秒有效）。
 *
 * @author Qoder
 * @since 2026/09/17
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityService {

    private static final String KEY_PREFIX = "activity:user:";
    private static final Duration ONLINE_TTL = Duration.ofSeconds(60);

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * 记录用户活跃（认证请求触发；失败静默不阻断业务）。
     *
     * @param userId 用户ID
     */
    public void touch(Long userId) {
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + userId, System.currentTimeMillis(), ONLINE_TTL);
        } catch (Exception exception) {
            log.debug("Touch activity failed. userId: {}, error: {}", userId, exception.getMessage());
        }
    }

    /**
     * 判断一组用户中哪些处于在线状态（60 秒内有活跃）。
     *
     * @param userIds 用户ID列表
     * @return 在线用户ID集合
     */
    public Set<Long> onlineAmong(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Set.of();
        }
        try {
            List<String> keys = userIds.stream().map(id -> KEY_PREFIX + id).toList();
            List<Object> values = redisTemplate.opsForValue().multiGet(keys);
            Set<Long> online = new HashSet<>();
            for (int i = 0; i < userIds.size(); i++) {
                if (values != null && i < values.size() && values.get(i) != null) {
                    online.add(userIds.get(i));
                }
            }
            return online;
        } catch (Exception exception) {
            log.debug("Query online status failed: {}", exception.getMessage());
            return Set.of();
        }
    }
}
