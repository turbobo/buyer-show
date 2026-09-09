package com.buyershow.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName(value = "posts", autoResultMap = true)
public class Post {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String title;
    private String content;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> images;

    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> tags;

    private String productName;
    private BigDecimal productPrice;
    private String productSource;
    private Integer productRating;

    private Integer likeCount;
    private Integer commentCount;
    private Integer favoriteCount;

    /** 0=公开 1=隐藏 2=删除 */
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
