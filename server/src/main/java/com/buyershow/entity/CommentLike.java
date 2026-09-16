package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 评论点赞关系。
 *
 * @author Qoder
 * @since 2026/09/16
 */
@Data
@TableName("comment_likes")
public class CommentLike {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long commentId;
    private Long userId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
