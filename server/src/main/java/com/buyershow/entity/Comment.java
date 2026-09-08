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

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
