package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 管理员处理举报请求。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@Data
public class HandleReportRequest {

    @NotBlank(message = "处理动作不能为空")
    @Pattern(regexp = "ACCEPT|DISMISS", message = "处理动作仅支持 ACCEPT 或 DISMISS")
    private String action;

    /** 采纳举报时是否同时封禁内容作者（可选，默认否） */
    private Boolean banAuthor;
}
