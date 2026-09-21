package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 话题创建/更新请求（G10）。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class TopicRequest {
    @NotBlank
    @Size(max = 20)
    private String name;

    @Size(max = 500)
    private String coverUrl;

    @Size(max = 200)
    private String description;

    private Integer sortOrder;

    /** 仅更新时使用：0=启用 1=停用。 */
    private Integer status;
}
