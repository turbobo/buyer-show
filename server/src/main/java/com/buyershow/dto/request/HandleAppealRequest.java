package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 管理员处理申诉请求。
 */
@Data
public class HandleAppealRequest {
    /** 处理动作：APPROVE（通过并解封）/ REJECT（驳回） */
    @NotBlank(message = "处理动作不能为空")
    private String action;

    @Size(max = 500, message = "处理说明最多500字符")
    private String reason;
}
