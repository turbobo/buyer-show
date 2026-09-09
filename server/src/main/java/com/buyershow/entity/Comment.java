package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("comments")
public class Comment {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long postId;
    private Long userId;
    private Long parentId;
    private String content;
    private Integer replyCount;
    private Integer likeCount;

    /** 0=正常 1=删除 */
    private Integer status;

    /** 0=通过 1=待人工审核 2=驳回 */
    private Integer moderationStatus;
    private String moderationReason;
    private Long moderatedBy;
    private LocalDateTime moderatedAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
