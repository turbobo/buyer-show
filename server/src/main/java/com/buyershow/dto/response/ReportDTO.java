package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理端举报 DTO。
 */
@Data
@Builder
public class ReportDTO {
    private Long id;
    private String contentType;
    private Long contentId;
    private Long reporterId;
    private String reporterNickname;
    private String reason;
    /** 被举报帖子标题（contentType=POST 时） */
    private String postTitle;
    /** 被举报评论内容（contentType=COMMENT 时） */
    private String commentContent;
    private Integer status;
    private String handleResult;
    private Long handledBy;
    private LocalDateTime createdAt;
    private LocalDateTime handledAt;
}
