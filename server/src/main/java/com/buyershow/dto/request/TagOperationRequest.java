package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 标签操作请求（重命名/合并/删除；删除时仅用 source）。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
public class TagOperationRequest {

    @NotBlank(message = "标签不能为空")
    private String source;

    /** 新标签名（重命名/合并时必填） */
    private String target;
}
