package com.buyershow.common.util;

import com.buyershow.common.ErrorCode;
import com.buyershow.common.exception.BusinessException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

public final class CursorUtils {

    private CursorUtils() {}

    public static String encode(Long id) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(String.valueOf(id).getBytes(StandardCharsets.UTF_8));
    }

    public static Long decode(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            Long id = Long.valueOf(raw);
            if (id <= 0) {
                throw new IllegalArgumentException("invalid cursor");
            }
            return id;
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.PARAM_INVALID, "分页游标格式错误");
        }
    }
}
