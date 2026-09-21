package com.buyershow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理端精选列表行（G10）：轻量字段，供运营打标。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class AdminPostRow {
    private Long id;
    private String title;
    /** 0=否 1=是。 */
    private Integer isFeatured;
    /** 0=通过 1=待审 2=驳回。 */
    private Integer moderationStatus;
    private LocalDateTime createdAt;
}
