package com.buyershow.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 精选标记请求（G10）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class FeaturedRequest {
    @NotNull
    private Boolean featured;
}
