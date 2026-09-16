package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 帖子申诉。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
@TableName("post_appeals")
public class PostAppeal {
    private Long id;
    private Long postId;
    private Long userId;
    private String reason;
    /** 状态：0 待处理 / 1 已通过 / 2 已驳回 */
    private Integer status;
    private String handleReason;
    private Long handledBy;
    private LocalDateTime handledAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
