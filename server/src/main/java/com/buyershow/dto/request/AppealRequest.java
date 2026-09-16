package com.buyershow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 发起帖子申诉请求。
 */
@Data
public class AppealRequest {
    @NotBlank(message = "申诉理由不能为空")
    @Size(max = 500, message = "申诉理由最多500字符")
    private String reason;
}
