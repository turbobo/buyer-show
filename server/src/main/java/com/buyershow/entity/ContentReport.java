package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户提交的帖子或评论举报。
 *
 * @author Qoder
 * @since 2026/09/08
 */
@Data
@TableName("content_reports")
public class ContentReport {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long reporterId;
    private Integer contentType;
    private Long contentId;
    private String reason;
    private String description;
    private Integer status;
    private Long handledBy;
    private LocalDateTime handledAt;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
