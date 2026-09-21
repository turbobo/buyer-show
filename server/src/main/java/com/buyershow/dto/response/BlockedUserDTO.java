package com.buyershow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 拉黑列表条目。
 *
 * @author Qoder
 * @since 2026/09/21
 */
@Data
public class BlockedUserDTO {
    private Long id;
    private String nickname;
    private String avatarUrl;
    private LocalDateTime blockedAt;
}
