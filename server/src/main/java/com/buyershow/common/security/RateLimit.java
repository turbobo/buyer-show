package com.buyershow.common.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * API 限流注解。
 * 
 * @param key 限流 key 前缀（默认使用方法名）
 * @param limit 窗口内最大请求数
 * @param windowSeconds 时间窗口（秒）
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    String key() default "";
    int limit() default 60;
    int windowSeconds() default 60;
}
