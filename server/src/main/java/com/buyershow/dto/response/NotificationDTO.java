package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationDTO {
    private Long id;
    private String type;
    private String content;
    private Integer isRead;
    private LocalDateTime createdAt;
    private String targetType;
    private Long targetId;

    // Actor info
    private Long actorId;
    private String actorNickname;
    private String actorAvatarUrl;
}
