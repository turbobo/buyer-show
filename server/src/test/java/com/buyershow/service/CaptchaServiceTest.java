package com.buyershow.service;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;
import com.buyershow.dto.response.CaptchaDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 图形验证码服务测试。
 *
 * @author Qoder
 * @since 2026/09/17
 */
class CaptchaServiceTest {

    @SuppressWarnings("unchecked")
    private final ValueOperations<String, Object> valueOperations = mock(ValueOperations.class);
    private final RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class);
    private final CaptchaService service = new CaptchaService(redisTemplate);

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    void testGenerateStoresCodeWithTtl() {
        CaptchaDTO dto = service.generate();

        ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(eq("captcha:" + dto.getCaptchaId()), codeCaptor.capture(), eq(Duration.ofMinutes(5)));
        assertEquals(4, codeCaptor.getValue().length());
        assertTrue(dto.getImage().startsWith("data:image/svg+xml;base64,"));
    }

    @Test
    void testVerifyConsumesOnceAndRejectsWrongCode() {
        when(valueOperations.get("captcha:abc")).thenReturn("AB23");

        service.verify("abc", "ab23");

        verify(redisTemplate).delete("captcha:abc");
        BusinessException exception = assertThrows(BusinessException.class, () -> service.verify("abc", "WRONG"));
        assertEquals(ErrorCode.CAPTCHA_INVALID.getCode(), exception.getCode());
    }

    @Test
    void testVerifyRejectsBlankInput() {
        BusinessException exception = assertThrows(BusinessException.class, () -> service.verify(null, ""));
        assertEquals(ErrorCode.CAPTCHA_INVALID.getCode(), exception.getCode());
    }
}
