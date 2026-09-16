package com.buyershow.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 我的评论行（含所属帖子标题与审核状态，仅本人可见）。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
public class UserCommentRow {
    private Long id;
    private Long postId;
    private String postTitle;
    private String content;
    private Integer moderationStatus;
    private LocalDateTime createdAt;
}
