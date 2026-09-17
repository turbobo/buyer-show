package com.buyershow.common.security;

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

    /** 硬限流阈值（不提供验证码时） */
    public static final int HARD_LIMIT_ATTEMPTS = MAX_ATTEMPTS;

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
     * 记录一次登录尝试（账号与 IP 双维度 INCR，不拦截），返回账号维度当前次数。
     * 限流与验证码要求由调用方根据次数决定。
     *
     * @param identifier 用户名/手机号/邮箱
     * @param ip         客户端 IP
     * @return 账号维度当前窗口内尝试次数
     */
    public long recordAttempt(String identifier, String ip) {
        String accountKey = "rate:login:account:" + identifier;
        Long accountCount = redisTemplate.execute(
                RATE_LIMIT_SCRIPT,
                Collections.singletonList(accountKey),
                WINDOW_SECONDS);
        String ipKey = "rate:login:ip:" + ip;
        Long ipCount = redisTemplate.execute(
                RATE_LIMIT_SCRIPT,
                Collections.singletonList(ipKey),
                WINDOW_SECONDS);
        if (ipCount != null && ipCount > MAX_ATTEMPTS) {
            log.warn("Login rate limit exceeded for IP: {}", ip);
        }
        return accountCount == null ? 0L : accountCount;
    }

    /**
     * 判断 IP 维度是否已超硬限流阈值。
     *
     * @param ip 客户端 IP
     * @return 是否超限
     */
    public boolean isIpRateLimited(String ip) {
        Object value = redisTemplate.opsForValue().get("rate:login:ip:" + ip);
        if (value instanceof Number number) {
            return number.longValue() > MAX_ATTEMPTS;
        }
        return false;
    }

    /**
     * 登录成功后清除计数（避免误伤正常用户）。
     */
    public void clearAttempts(String identifier, String ip) {
        redisTemplate.delete(Collections.singletonList("rate:login:account:" + identifier));
        redisTemplate.delete(Collections.singletonList("rate:login:ip:" + ip));
    }
}
