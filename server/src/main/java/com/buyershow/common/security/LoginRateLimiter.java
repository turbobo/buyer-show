package com.buyershow.common.security;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.util.Collections;

/**
 * 登录接口限流器（基于 Redis 的滑动窗口）。
 * 使用 Lua 脚本保证 INCR + EXPIRE 原子性。
 *
 * Key 设计：
 * - rate:login:account:{identifier} — 账号维度
 * - rate:login:ip:{ip}              — IP 维度
 *
 * 窗口：15 分钟内最多 5 次失败尝试。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final long WINDOW_SECONDS = 15 * 60; // 15 分钟

    private static final String LUA_RATE_LIMIT =
            "local current = redis.call('INCR', KEYS[1]) " +
            "if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end " +
            "return current";

    private static final DefaultRedisScript<Long> RATE_LIMIT_SCRIPT;

    static {
        RATE_LIMIT_SCRIPT = new DefaultRedisScript<>();
        RATE_LIMIT_SCRIPT.setScriptText(LUA_RATE_LIMIT);
        RATE_LIMIT_SCRIPT.setResultType(Long.class);
    }

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * 检查是否允许登录尝试。
     *
     * @param identifier 用户名/手机号/邮箱
     * @param ip         客户端 IP
     */
    public void checkRateLimit(String identifier, String ip) {
        // 检查账号维度
        String accountKey = "rate:login:account:" + identifier;
        Long accountCount = redisTemplate.execute(
                RATE_LIMIT_SCRIPT,
                Collections.singletonList(accountKey),
                WINDOW_SECONDS);
        if (accountCount != null && accountCount > MAX_ATTEMPTS) {
            log.warn("Login rate limit exceeded for account: {}", identifier);
            throw new BusinessException(ErrorCode.RATE_LIMITED, "登录尝试次数过多，请 15 分钟后再试");
        }

        // 检查 IP 维度
        String ipKey = "rate:login:ip:" + ip;
        Long ipCount = redisTemplate.execute(
                RATE_LIMIT_SCRIPT,
                Collections.singletonList(ipKey),
                WINDOW_SECONDS);
        if (ipCount != null && ipCount > MAX_ATTEMPTS) {
            log.warn("Login rate limit exceeded for IP: {}", ip);
            throw new BusinessException(ErrorCode.RATE_LIMITED, "登录尝试次数过多，请 15 分钟后再试");
        }
    }

    /**
     * 登录成功后清除计数（避免误伤正常用户）。
     */
    public void clearAttempts(String identifier, String ip) {
        redisTemplate.delete(Collections.singletonList("rate:login:account:" + identifier));
        redisTemplate.delete(Collections.singletonList("rate:login:ip:" + ip));
    }
}
