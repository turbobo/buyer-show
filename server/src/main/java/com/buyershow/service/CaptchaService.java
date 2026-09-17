package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.response.CaptchaDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;

/**
 * 图形验证码：生成（SVG）与一次性校验（Redis 存储，5 分钟有效）。
 *
 * @author Qoder
 * @since 2026/09/17
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CaptchaService {

    private static final String KEY_PREFIX = "captcha:";
    private static final Duration TTL = Duration.ofMinutes(5);
    private static final int CODE_LENGTH = 4;
    /** 去除 0/O、1/I 等易混淆字符 */
    private static final String CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * 生成验证码（返回 captchaId 与 SVG 图片 data URI）。
     *
     * @return 验证码
     */
    public CaptchaDTO generate() {
        String code = randomCode();
        String captchaId = UUID.randomUUID().toString().replace("-", "");
        redisTemplate.opsForValue().set(KEY_PREFIX + captchaId, code, TTL);
        return new CaptchaDTO(captchaId, renderSvg(code));
    }

    /**
     * 校验并一次性消费验证码（无论成败均删除，防重放）。
     *
     * @param captchaId 验证码ID
     * @param captchaCode 用户输入
     */
    public void verify(String captchaId, String captchaCode) {
        if (captchaId == null || captchaId.isBlank() || captchaCode == null || captchaCode.isBlank()) {
            throw new BusinessException(ErrorCode.CAPTCHA_INVALID);
        }
        String key = KEY_PREFIX + captchaId;
        Object stored = redisTemplate.opsForValue().get(key);
        redisTemplate.delete(key);
        if (stored == null || !captchaCode.trim().equalsIgnoreCase(stored.toString())) {
            throw new BusinessException(ErrorCode.CAPTCHA_INVALID);
        }
    }

    private String randomCode() {
        StringBuilder code = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        return code.toString();
    }

    private String renderSvg(String code) {
        StringBuilder svg = new StringBuilder(768);
        svg.append("<svg xmlns='http://www.w3.org/2000/svg' width='140' height='44' viewBox='0 0 140 44'>");
        svg.append("<rect width='140' height='44' fill='#fdf2f4'/>");
        for (int i = 0; i < 5; i++) {
            svg.append("<line x1='").append(rand(0, 140)).append("' y1='").append(rand(0, 44))
                    .append("' x2='").append(rand(0, 140)).append("' y2='").append(rand(0, 44))
                    .append("' stroke='#f4a3b0' stroke-width='1'/>");
        }
        for (int i = 0; i < code.length(); i++) {
            int x = 18 + i * 28;
            svg.append("<text x='").append(x).append("' y='").append(30 + rand(-4, 5))
                    .append("' font-family='monospace' font-size='24' font-weight='bold' fill='#e05a74'")
                    .append(" transform='rotate(").append(rand(-14, 15)).append(" ").append(x).append(" 26)'>")
                    .append(code.charAt(i)).append("</text>");
        }
        svg.append("</svg>");
        return "data:image/svg+xml;base64,"
                + Base64.getEncoder().encodeToString(svg.toString().getBytes(StandardCharsets.UTF_8));
    }

    private int rand(int min, int max) {
        return min + RANDOM.nextInt(max - min);
    }
}
