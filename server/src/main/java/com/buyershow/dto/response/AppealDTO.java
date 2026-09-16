package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理端申诉视图。
 */
@Data
@Builder
public class AppealDTO {
    private Long id;
    private Long postId;
    private String postTitle;
    private Long userId;
    private String userNickname;
    private String reason;
    /** 状态：0 待处理 / 1 已通过 / 2 已驳回 */
    private Integer status;
    private String handleReason;
    private LocalDateTime createdAt;
    private LocalDateTime handledAt;
}
