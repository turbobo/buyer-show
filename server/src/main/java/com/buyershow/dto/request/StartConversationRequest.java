package com.buyershow.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 发起私信会话请求。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
public class StartConversationRequest {

    @NotNull(message = "目标用户不能为空")
    private Long targetUserId;
}
