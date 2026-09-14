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
    private Integer status;
    private String handleResult;
    private Long handledBy;
    private LocalDateTime createdAt;
    private LocalDateTime handledAt;
}
