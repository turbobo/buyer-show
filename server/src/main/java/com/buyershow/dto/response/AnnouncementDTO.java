package com.buyershow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 系统公告（G11）：实时推送与列表展示共用。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class AnnouncementDTO {
    private Long id;
    private String title;
    private String content;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
