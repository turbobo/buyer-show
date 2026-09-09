package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 创建内容举报请求。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@Data
public class CreateContentReportRequest {

    @NotBlank(message = "内容类型不能为空")
    @Pattern(regexp = "POST|COMMENT", message = "内容类型仅支持 POST 或 COMMENT")
    private String contentType;

    @NotNull(message = "内容ID不能为空")
    private Long contentId;

    @NotBlank(message = "举报原因不能为空")
    @Size(max = 50, message = "举报原因最多50字符")
    private String reason;

    @Size(max = 500, message = "补充描述最多500字符")
    private String description;
}
