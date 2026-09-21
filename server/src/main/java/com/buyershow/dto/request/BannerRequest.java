package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Banner 创建/更新请求（G10）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class BannerRequest {
    @NotBlank
    @Size(max = 100)
    private String title;

    @NotBlank
    @Size(max = 500)
    private String imageUrl;

    @NotBlank
    @Pattern(regexp = "post|topic|url")
    private String linkType;

    @Size(max = 500)
    private String linkValue;

    private Integer sortOrder;

    /** 仅更新时使用：0=启用 1=停用。 */
    private Integer status;
}
