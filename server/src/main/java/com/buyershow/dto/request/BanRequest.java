package com.buyershow.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 封禁请求（用户/帖子共用）。
 */
@Data
public class BanRequest {
    @Size(max = 200, message = "理由最多200字符")
    private String reason;
}
