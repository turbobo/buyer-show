package com.buyershow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 私信消息。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
public class MessageDTO {
    private Long id;
    private Long conversationId;
    private Long senderId;
    private Long receiverId;
    private String content;
    private Integer isRead;
    private LocalDateTime createdAt;
}
