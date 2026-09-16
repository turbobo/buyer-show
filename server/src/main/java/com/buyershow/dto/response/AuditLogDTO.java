package com.buyershow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 审计日志行（含操作管理员昵称）。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
public class AuditLogDTO {
    private Long id;
    private Long adminId;
    private String adminNickname;
    private String action;
    private String targetType;
    private Long targetId;
    private String detail;
    private LocalDateTime createdAt;
}
