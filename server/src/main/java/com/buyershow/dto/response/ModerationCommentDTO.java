package com.buyershow.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 管理端评论审核 DTO。
 */
@Data
@Builder
public class ModerationCommentDTO {
    private Long id;
    private Long postId;
    private Long userId;
    private String userNickname;
    private Long parentId;
    private String content;
    private Integer replyCount;
    private Integer likeCount;
    private Integer status;
    private Integer moderationStatus;
    private String moderationReason;
    private LocalDateTime createdAt;
}
