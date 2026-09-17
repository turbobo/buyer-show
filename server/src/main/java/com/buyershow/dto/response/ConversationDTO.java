package com.buyershow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 会话列表行（含对方信息、最后消息与我的未读数）。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
public class ConversationDTO {
    private Long id;
    private Long peerId;
    private String peerNickname;
    private String peerAvatarUrl;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private Integer unreadCount;
    /** 对方是否在线（60 秒内有活跃） */
    private Boolean peerOnline;
}
