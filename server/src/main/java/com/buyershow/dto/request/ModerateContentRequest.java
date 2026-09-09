package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 管理员审核内容请求。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@Data
public class ModerateContentRequest {

    @NotBlank(message = "审核状态不能为空")
    @Pattern(regexp = "APPROVE|REJECT", message = "审核状态仅支持 APPROVE 或 REJECT")
    private String action;

    @Size(max = 500, message = "审核说明最多500字符")
    private String reason;
}
