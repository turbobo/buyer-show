package com.buyershow.common.security;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 登录接口限流器（基于内存的滑动窗口）。
 * 生产环境建议替换为 Redis 实现。
 */
@Slf4j
@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_MILLIS = 15 * 60 * 1000; // 15 分钟

    private final Map<String, AttemptWindow> attempts = new ConcurrentHashMap<>();

    /**
     * 检查是否允许登录尝试。
     * @param identifier 用户名/手机号/邮箱
     * @param ip 客户端 IP
     */
    public void checkRateLimit(String identifier, String ip) {
        Instant now = Instant.now();
        
        // 检查账号维度
        AttemptWindow accountWindow = attempts.computeIfAbsent(
                "account:" + identifier, k -> new AttemptWindow());
        if (!accountWindow.tryAcquire(now)) {
            log.warn("Login rate limit exceeded for account: {}", identifier);
            throw new BusinessException(ErrorCode.RATE_LIMITED, "登录尝试次数过多，请 15 分钟后再试");
        }

        // 检查 IP 维度
        AttemptWindow ipWindow = attempts.computeIfAbsent(
                "ip:" + ip, k -> new AttemptWindow());
        if (!ipWindow.tryAcquire(now)) {
            log.warn("Login rate limit exceeded for IP: {}", ip);
            throw new BusinessException(ErrorCode.RATE_LIMITED, "登录尝试次数过多，请 15 分钟后再试");
        }
    }

    /**
     * 登录成功后清除计数。
     */
    public void clearAttempts(String identifier, String ip) {
        attempts.remove("account:" + identifier);
        attempts.remove("ip:" + ip);
    }

    /**
     * 定期清理过期窗口（可选，防止内存泄漏）。
     */
    public void cleanup() {
        Instant cutoff = Instant.now().minusMillis(WINDOW_MILLIS);
        attempts.entrySet().removeIf(entry -> entry.getValue().windowStart.isBefore(cutoff));
    }

    private static class AttemptWindow {
        volatile Instant windowStart = Instant.now();
        final AtomicInteger count = new AtomicInteger(0);

        boolean tryAcquire(Instant now) {
            // 窗口过期则重置
            if (now.toEpochMilli() - windowStart.toEpochMilli() > WINDOW_MILLIS) {
                synchronized (this) {
                    if (now.toEpochMilli() - windowStart.toEpochMilli() > WINDOW_MILLIS) {
                        windowStart = now;
                        count.set(0);
                    }
                }
            }
            return count.incrementAndGet() <= MAX_ATTEMPTS;
        }
    }
}
