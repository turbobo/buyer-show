package com.buyershow.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 图形验证码（SVG data URI）。
 *
 * @author Qoder
 * @since 2026/09/17
 */
@Data
@AllArgsConstructor
public class CaptchaDTO {
    private String captchaId;
    /** data:image/svg+xml;base64,... */
    private String image;
}
