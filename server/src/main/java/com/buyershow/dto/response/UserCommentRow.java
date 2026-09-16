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
    /** 游标键（收藏列表为 favorite_comments.id；评论列表为 comments.id） */
    private Long cursorKey;

    private Long id;
    private Long postId;
    private String postTitle;
    private String content;
    private Integer moderationStatus;
    private LocalDateTime createdAt;
}
